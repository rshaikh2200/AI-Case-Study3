import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
// Remove OpenAI import
// import { OpenAI } from 'openai';

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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
      // Optionally, add a site filter if you wish to target a specific website:
      // siteSearch: 'jointcommission.org'
    };

    // Call the Google Search API
    const response = await axios.get(serviceUrl, { params });
    const results = response.data;

    let combinedResultsText = "";
    if (results && results.items && results.items.length > 0) {
      results.items.forEach((item) => {
        // Combine the link and snippet from each result
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
// Existing functions (unchanged except for removing any OpenAI references)
// -------------------------
function parseCaseStudies(responseText) {
  try {
    let jsonString = '';

    // Attempt to parse JSON from code fences
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Attempt to parse the entire response as JSON
      jsonString = responseText;
    }

    // Remove comments (lines starting with //)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');

    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    // Parse the cleaned JSON string
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Further validation
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

    // Transform into desired format
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

    // Attempt to parse JSON from code fences
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Attempt to parse the entire response as JSON
      jsonString = responseText;
    }

    // Remove comments (lines starting with //)
    jsonString = jsonString.replace(/\/\/.*$/gm, '');

    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    // Parse the cleaned JSON string
    const parsed = JSON.parse(jsonString);

    if (!parsed.caseStudies || !Array.isArray(parsed.caseStudies)) {
      throw new Error('Invalid JSON structure: Missing "caseStudies" array.');
    }

    // Further validation
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

    // Transform into desired format including correct answers and hints
    return parsed.caseStudies.map((cs, index) => ({
      department: cs.department, // Added department
      role: cs.role,             // Added role
      specialization: cs.specialization, // Added specialization
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
  // Retrieve the API keys and environment variables from environment
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // no longer used
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;

  // NEW: Hugging Face Inference endpoints and token
  const HF_INFERENCE_EMBEDDING_URL = process.env.HF_INFERENCE_EMBEDDING_URL;  // for embeddings
  const HF_INFERENCE_URL = process.env.HF_INFERENCE_URL;                     // for chat completions
  const HF_API_KEY = process.env.HF_API_KEY;                                 // hugging face token

  const pc = new Pinecone({ apiKey: PINECONE_API_KEY, });
  const index = pc.Index('coachcarellm').namespace('( Default )'); 
  // Ensure 'rag-riz' or your actual index name and correct namespace

  // Remove OpenAI client initialization
  // const openai = new OpenAI({ apiKey: OPENAI_API_KEY, });

  // Extract request body
  const { department, role, specialization, userType, care } = await request.json();

  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization};`;

  // Create an embedding for the input query (replacing OpenAI's embeddings)
  let queryEmbedding;
  try {
    const embeddingPayload = {
      inputs: query,
    };

    // Call your HF embedding endpoint
    const hfEmbeddingRes = await fetch(HF_INFERENCE_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify(embeddingPayload),
    });

    const hfEmbeddingData = await hfEmbeddingRes.json();

    // Transform the HF embedding response into an OpenAI-like shape so the existing logic remains
    // Adjust the property access below based on how your HF embedding model returns data.
    const embeddingResponse = {
      data: [
        {
          // Example assumption: HF returns an array of objects, each with { embedding: [ ... ] }
          embedding: hfEmbeddingData[0]?.embedding 
        }
      ]
    };

    if (
      !embeddingResponse.data ||
      !Array.isArray(embeddingResponse.data) ||
      embeddingResponse.data.length === 0
    ) {
      throw new Error('Invalid embedding data structure.');
    }

    queryEmbedding = embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
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
      topK: 500, // Set to maximum allowable value
      includeMetadata: true,
    });

    // Process the response as needed
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

  // NEW: Retrieve additional case studies scenarios from Google Search API
  const googleResultsText = await getMedicalCaseStudiesFromGoogle();

  // Combine the Pinecone results and Google search results into one text block
  const retrievedCasesText = similarCaseStudies.join('\n');

  // Construct the meta prompt with retrieved case studies and Google search results
  const META_PROMPT =
    `You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation ...
( keep EXACT instructions; omitted for brevity )`;


  try {
    // 1) Send our META_PROMPT to Hugging Face
    const hfBody = {
      inputs: META_PROMPT
    };

    const hfResponse = await fetch(HF_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify(hfBody),
    });

    if (!hfResponse.ok) {
      const errorData = await hfResponse.json();
      console.error('Error from HF API:', errorData);
      throw new Error(errorData.error || 'Unknown error from Hugging Face');
    }

    const hfData = await hfResponse.json();

    // Transform HF response into an OpenAI-like shape:
    // Adjust if your HF endpoint returns a different shape.
    // Often for text generation: hfData = [{ "generated_text": "..."}]
    const openAiStyleResponse = {
      choices: [
        {
          message: {
            content: hfData[0]?.generated_text // or whichever property holds the text
          }
        }
      ]
    };

    if (!openAiStyleResponse.choices || openAiStyleResponse.choices.length === 0) {
      throw new Error('No choices returned from HF.');
    }

    const aiResponse = openAiStyleResponse.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('No content returned from HF model.');
    }

    console.log('Raw Model Output:', aiResponse);

    // -------------------------
    // NEW CODE TO SAVE RAW MODEL OUTPUT TO A JSON FILE WITH DATE STAMP & USER INPUTS
    // -------------------------
    try {
      // Step 1: Write to /tmp (safe in serverless environments)
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

      // Step 2: Copy the file from /tmp to the project directory (src/app)
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
    // -------------------------
    // END OF NEW CODE
    // -------------------------

    // Parse the AI response using the existing function (without correct answers)
    const parsedCaseStudies = parseCaseStudies(aiResponse);

    // Parse the AI response using the new function (including correct answers and hints)
    let parsedCaseStudiesWithAnswers = parseCaseStudiesWithAnswers(aiResponse);

    console.log('Parsed Model Output:', parsedCaseStudiesWithAnswers);

    // Now, generate image prompts for each case study
    try {
      // For each case study, generate an image prompt
      const caseStudiesWithImagePrompts = await Promise.all(
        parsedCaseStudiesWithAnswers.map(async (caseStudy) => {
          const { prompt } = await generateImagePrompt(caseStudy);
          return {
            ...caseStudy,
            imagePrompt: prompt,
          };
        })
      );

      // Now, fetch images for case studies
      const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudiesWithImagePrompts);

      // Update parsedCaseStudiesWithAnswers with images
      parsedCaseStudiesWithAnswers = caseStudiesWithImages;

      // Also update parsedCaseStudies (the one without correct answers), if needed
      // For simplicity, let's update parsedCaseStudies similarly
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

// Function to generate image prompt (replaces the internal OpenAI call with HF fetch)
async function generateImagePrompt(caseStudy) {
  const META_PROMPT = `You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation ...
( keep EXACT instructions; omitted for brevity )`;

  const HF_INFERENCE_URL = process.env.HF_INFERENCE_URL;
  const HF_API_KEY = process.env.HF_API_KEY;

  if (!HF_API_KEY) {
    throw new Error('Hugging Face API key not configured.');
  }

  // Validate the scenario
  if (typeof caseStudy.scenario !== 'string' || caseStudy.scenario.trim() === '') {
    throw new Error('Invalid scenario provided to generateImagePrompt.');
  }

  // Instead of OpenAI, call your Hugging Face endpoint
  const messageForHF = `${META_PROMPT}\nScenario:\n${caseStudy.scenario}`;

  const hfBody = {
    inputs: messageForHF
  };

  const response = await fetch(HF_INFERENCE_URL, {
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

  // Again, shape it like an OpenAI response
  const openAiStyleResponse = {
    choices: [
      {
        message: {
          content: data[0]?.generated_text
        }
      }
    ]
  };

  const generatedPrompt = openAiStyleResponse.choices[0]?.message?.content;
  if (!generatedPrompt) {
    throw new Error('No prompt generated by HF model.');
  }

  return { ...caseStudy, prompt: generatedPrompt };
}

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

          const generatedPrompt = caseStudy.imagePrompt;
          const payload = {
            prompt: generatedPrompt,
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
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`, // Secure your API key in environment variables
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
