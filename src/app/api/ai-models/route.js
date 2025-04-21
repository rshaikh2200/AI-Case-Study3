import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';                       // re‐added for embeddings
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Instantiate OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hardcoded Hugging Face Inference Endpoint URL for text generation
const HUGGINGFACE_INFERENCE_URL = 'https://cnguhffmmdma52tu.us-east-1.aws.endpoints.huggingface.cloud';

// -------------------------
// NEW FUNCTION: Google Search API integration for Medical Error Case Studies
// -------------------------
async function getMedicalCaseStudiesFromGoogle() {
  try {
    // Set your search parameters here – adjust the query and search_depth as needed.
    const searchTerm = "Case Studies";
    const searchDepth = 50;
    const maxResults = 1000;

    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId = process.env.GOOGLE_CSE_ID;

    if (!googleApiKey || !googleCseId) {
      throw new Error("Google API key or Custom Search Engine ID not configured.");
    }

    // Construct the request URL and parameters
    const serviceUrl = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      q: searchTerm,
      key: googleApiKey,
      cx: googleCseId,
      num: searchDepth,
      siteSearch: 'https://psnet.ahrq.gov/webmm-case-studies'
    };

    // Call the Google Search API
    const response = await axios.get(serviceUrl, { params });
    const results = response.data;

    let combinedResultsText = "";
    if (results && results.items && results.items.length > 0) {
      results.items.forEach((item) => {
        combinedResultsText += `Source: ${item.link} - ${item.snippet}\n`;
      });
    } else {
      combinedResultsText = "No Google search results found for medical error case studies.";
    }
    return combinedResultsText;
  } catch (error) {
    console.error("Error in getMedicalCaseStudiesFromGoogle:", error.message);
    return "Error retrieving Google search results.";
  }
}

// -------------------------
// Existing parsing functions (unchanged)
// -------------------------
function parseCaseStudies(responseText) {
  try {
    let jsonString = '';

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = responseText;
    }

    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions)) {
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      }
      cs.questions.forEach((q, qIdx) => {
        if (!q.question || !q.options || Object.keys(q.options).length !== 4) {
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
        }
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      caseStudy: `Case Study ${index + 1}`,
      scenario: cs.scenario,
      questions: cs.questions.map((q) => ({
        question: q.question,
        options: Object.entries(q.options).map(([key, label]) => ({ key, label })),
      })),
    }));
  } catch (error) {
    console.error('Error parsing JSON response:', error.message);
    console.error('Received Response:', responseText);
    throw new Error('Failed to parse case studies JSON. Ensure the model outputs valid JSON.');
  }
}

function parseCaseStudiesWithAnswers(responseText) {
  try {
    let jsonString = '';

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      jsonString = responseText;
    }

    jsonString = jsonString.replace(/\/\/.*$/gm, '');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    parsed.caseStudies.forEach((cs, idx) => {
      if (!cs.scenario || !Array.isArray(cs.questions)) {
        throw new Error(`Case Study ${idx + 1} is missing "scenario" or "questions".`);
      }
      cs.questions.forEach((q, qIdx) => {
        if (
          !q.question ||
          !q.options ||
          Object.keys(q.options).length !== 4 ||
          !q['correct answer'] ||
          !q['Hint']
        ) {
          throw new Error(`Question ${qIdx + 1} in Case Study ${idx + 1} is incomplete.`);
        }
      });
    });

    return parsed.caseStudies.map((cs, index) => ({
      department: cs.department,
      role: cs.role,
      specialization: cs.specialization,
      caseStudy: `Case Study ${index + 1}`,
      scenario: cs.scenario,
      questions: cs.questions.map((q) => ({
        question: q.question,
        options: Object.entries(q.options).map(([key, label]) => ({ key, label })),
        correctAnswer: q['correct answer'],
        hint: q['Hint'],
      })),
    }));
  } catch (error) {
    console.error('Error parsing JSON response with answers:', error.message);
    console.error('Received Response:', responseText);
    throw new Error('Failed to parse case studies JSON with correct answers. Ensure the model outputs valid JSON.');
  }
}

export async function POST(request) {
  // Retrieve the API keys and environment variables
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;        // for embeddings
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;
  const HF_API_KEY = process.env.HF_API_KEY;                // for HF text generation

  // Initialize Pinecone
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pc.Index('coachcarellm').namespace('( Default )');

  // Extract request body
  const { department, role, specialization, userType, care } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization};`;

  // Create an embedding for the input query using OpenAI
  let queryEmbedding;
  try {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    queryEmbedding = embeddingRes.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to create embedding for the query.' },
      { status: 500 }
    );
  }

  // Query Pinecone for similar case studies
  let similarCaseStudies = [];
  try {
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK: 500,
      includeMetadata: true,
    });
    similarCaseStudies = pineconeResponse.matches.map(
      (match) => match.metadata.content
    );
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve similar case studies from Pinecone.' },
      { status: 500 }
    );
  }

  // Retrieve additional case studies from Google Search API
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();

  // Combine retrieved texts
  const retrievedCasesText = similarCaseStudies.join('\n');

  // Construct the meta prompt (keep EXACT instructions)
  const META_PROMPT =
    `You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation ...`;

  try {
    // Send our META_PROMPT to Hugging Face (hardcoded URL)
    const hfBody = { inputs: META_PROMPT };
    const hfResponse = await fetch(HUGGINGFACE_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify(hfBody),
    });

    const rawResponseText = await hfResponse.text();
    console.log('Raw Model Output:', rawResponseText);

    if (!hfResponse.ok) {
      console.error('Error from HF API:', rawResponseText);
      throw new Error('Unknown error from Hugging Face');
    }

    // Transform HF response into OpenAI-like shape
    let hfData;
    try {
      hfData = JSON.parse(rawResponseText);
    } catch {
      throw new Error('Invalid JSON from HF model');
    }
    const openAiStyleResponse = {
      choices: [
        {
          message: {
            content: Array.isArray(hfData) ? hfData[0]?.generated_text : hfData.generated_text
          }
        }
      ]
    };

    const aiResponse = openAiStyleResponse.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('No content returned from HF model.');
    }

    // Save raw model output to JSON file
    try {
      const tmpDirectory = '/tmp/case studies json';
      if (!fs.existsSync(tmpDirectory)) {
        fs.mkdirSync(tmpDirectory, { recursive: true });
      }
      const fileName = `case-studies-${Date.now()}.json`;
      const tmpFilePath = path.join(tmpDirectory, fileName);
      const dataToSave = {
        date: new Date().toISOString(),
        department,
        role,
        care,
        specialization,
        rawModelOutput: aiResponse
      };
      fs.writeFileSync(tmpFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      const appDirectory = path.join(process.cwd(), 'src', 'app');
      if (!fs.existsSync(appDirectory)) {
        fs.mkdirSync(appDirectory, { recursive: true });
      }
      const finalFilePath = path.join(appDirectory, fileName);
      fs.copyFileSync(tmpFilePath, finalFilePath);
      console.log(`✅ JSON file written to: ${finalFilePath}`);
    } catch (err) {
      console.error('❌ Error saving JSON file:', err);
    }

    // Parse responses
    const parsedCaseStudies = parseCaseStudies(aiResponse);
    let parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);
    console.log('Parsed Model Output:', parsedCaseStudiesWithAnswers);

    // Image prompt & fetching (original code unchanged)
    try {
      const caseStudiesWithImagePrompts = await Promise.all(
        parsedCaseStudiesWithAnswers.map(async (caseStudy) => {
          const { prompt } = await generateImagePrompt(caseStudy);
          return { ...caseStudy, imagePrompt: prompt };
        })
      );
      const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudiesWithImagePrompts);
      parsedCaseStudiesWithAnswers = caseStudiesWithImages;

      const parsedCaseStudiesWithImages = parsedCaseStudiesWithAnswers.map(cs => ({
        caseStudy: cs.caseStudy,
        scenario: cs.scenario,
        questions: cs.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          hint: q.hint,
        })),
        imageUrl: cs.imageUrl,
        role: cs.role,
        department: cs.department,
        specialization: cs.specialization,
      }));

      return NextResponse.json({
        caseStudies: parsedCaseStudiesWithImages,
        aiResponse: parsedCaseStudiesWithAnswers,
      });
    } catch (error) {
      console.error('Error generating images:', error);
      return NextResponse.json(
        { error: 'Failed to generate images for case studies.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Function to generate image prompt (using Hugging Face endpoint)
async function generateImagePrompt(caseStudy) {
  const META_PROMPT = `You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation ...`;
  const HF_API_KEY = process.env.HF_API_KEY;

  if (!HF_API_KEY) {
    throw new Error('Hugging Face API key not configured.');
  }
  if (typeof caseStudy.scenario !== 'string' || caseStudy.scenario.trim() === '') {
    throw new Error('Invalid scenario provided to generateImagePrompt.');
  }

  const messageForHF = `${META_PROMPT}\nScenario:\n${caseStudy.scenario}`;
  const hfBody = { inputs: messageForHF };

  const response = await fetch(HUGGINGFACE_INFERENCE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify(hfBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('HF API Error:', errorData);
    throw new Error(`HF API Error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const generatedPrompt = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  if (!generatedPrompt) {
    throw new Error('No prompt generated by HF model.');
  }
  return { ...caseStudy, prompt: generatedPrompt };
}

// Original image-generation helper (unchanged)
async function fetchImagesForCaseStudies(
  caseStudies,
  model = 'sd3-large',
  aspect_ratio = '1:1'
) {
  try {
    const responses = await Promise.all(
      caseStudies.map(async (caseStudy) => {
        try {
          if (!caseStudy.imagePrompt) {
            console.warn(`No image prompt for ${caseStudy.caseStudy}. Skipping image generation.`);
            return { ...caseStudy, imageUrl: null };
          }
          const payload = {
            prompt: caseStudy.imagePrompt,
            output_format: 'jpeg',
            model,
            aspect_ratio,
            width: 356,
            height: 356,
          };
          const formData = new FormData();
          Object.keys(payload).forEach((key) => formData.append(key, payload[key]));

          const response = await axios.post(
            `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
            formData,
            {
              validateStatus: undefined,
              responseType: 'arraybuffer',
              headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
                Accept: 'image/*',
              },
            }
          );

          if (response.status === 200) {
            const base64Image = Buffer.from(response.data).toString('base64');
            return {
              ...caseStudy,
              imageUrl: `data:image/jpeg;base64,${base64Image}`,
            };
          } else {
            console.warn(
              `Failed to generate image for ${caseStudy.caseStudy}. Status: ${response.status}`,
              response.data
            );
            return { ...caseStudy, imageUrl: null };
          }
        } catch (error) {
          if (error.response) {
            console.error('Stability API Error:', error.response.status, error.response.data);
          } else if (error.request) {
            console.error('No response received from Stability API:', error.request);
          } else {
            console.error('Error generating image:', error.message);
          }
          return { ...caseStudy, imageUrl: null };
        }
      })
    );
    return responses;
  } catch (error) {
    console.error('Error in fetchImagesForCaseStudies:', error.message);
    throw error;
  }
}
