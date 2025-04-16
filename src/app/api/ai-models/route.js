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
    `Use the medical case study text from ${retrievedCasesText}, to write 4 similar medical case studies (250 words) that are tailored towards a ${role} specializing in ${specialization} working in the ${department} department, without compromising the clinical integrity. Remove extraneous information such as providers’ 
countries of origin or unnecessary backstories.

The medical case study should:

- **Include the following details before the case study:**
  - **Role:** Specify the role of the individual involved.
  - **Department:** Indicate the department where the scenario takes place.
  - **Specialization:** Mention the specialization of the role.
  - **Care:** Mention the care level of the role.

- **Medical Case Study Content:**
  - The case study should only include the scenario and the medical error that occured.
  - The case studies should not mention country names, staff origins.
  - Use unique patient and medical staff names from various continents (America, Canada, South America, 
    Europe, Asia, Australia) to reflect global diversity.
  - The case study should include proper age for the patients. 
  - The case study should define medication with quantity with proper units, and proper names without changing the clinical integrity from source  ${retrievedCasesText} case study.
  - Keep the case studies short and concise, and do not mention countries by name or the team's review of the situation. Also do not include or refer to incident reviews, analysis, or describe which error prevention approach was attempted or missing.
  - The case study should strictly focus on what went wrong. Avoid mentioning any broader communication lapses or the significance of teamwork in preventing the error.
  - The case study should not mention any error prevention tools and how they the situation lacked the EPT which could have avoided the error.
  - The case study should  only include the scenario and remove /not include any analysis on what went wrong, how it could have been prevented, and any highlights of the process to fix the issue. 
  - If department is ${department} make sure all the case studies scenario focus on stroke related medical errors and scenarios, but also Make sure the clinical scenario and clinical integretity remains similar to the original  ${retrievedCasesText} case studies
  - For all case studies, make sure the clinical scenario and clinical integretity remains similar to the original  ${retrievedCasesText} case studies.

  - **Incorporate the following feedback into the case studies and questions without altering any other instructions or logic:**
  - If ${role} equals registered nurse, ensure nurses do not write medication orders; they may administer medications, and if there is a concern from another nurse, that nurse would apply ARCC (not the one administering).
  - Ensure correct usage and spelling of \\mmHg\\ and other units.
  - If ${role} equals Nurse Practictioner or Medical Aisstant,  they typically write medication orders rather than administer them; they may have a peer check their order electronically before finalizing.
  - Use **unique names** for the patient and provider; avoid any duplicate names.
  - For **medication allegeries**, reflect a more appropriate and clinical accurate reactions.
  - Make sure the case study follow clinical integrity when describing when a patient should take a certain medication, or timely adminstration of medication.
  - make sure certain medication should be administered via a pump if it’s an infusion (not via injection), this should follow the clinical integrity.
  - Correct and make sure there is no misspelling in Medication Nmaes, and Procedures. 
  - Documentation is typically **electronic**, so do not mention paper order sheets.
  - If you include ARCC, it should be used properly by the person raising the concern, not necessarily by the one providing direct care.

    - **For each case study, create 3 unique multiple-choice questions that:**
        - Have 4 option choices each.
        - Debrief is typically a group effort; the question should not reflect debrief being done by a single individual.
        - Provide the correct answer choice and answer in the format: \\correct answer: C) Validate and Verify\\
        - Provide the hint in the format: \\Hint: Double-checking and confirming accuracy before proceeding.\\
        - In the question include specific key words hints based on the correct answer choice, utilizing the definition of the safety behavior to assist the user. The safety behaviors name should not be included in the question.
        - Each question should strictly focus on the assigned safety behavior and how it could have been applied to prevent the error in the case study.
        - Include clues by using buzzwords or synonyms from the correct answer's definition.
        -  Do not explicitly mention the prevention tools by name in the question header.
        - The question should be straightforward and concise; do not state any buzzwords in the question itself (e.g., using buzzwords like “check” or “validate?”).
          - The question should address ${role} directly and following this example format: If Dr. Patel would have stopped the line to address concerns immediately, which Safety Behavior that focuses on stopping and addressing concerns would he be applying

    
    - **Strictly follow the Question Structure Below and make sure the options choices match the correct safety behaviors focused in the question:**
      - **Case Study 1:**
        - Question 1: Focuses on Peer Checking and Coaching
        - Question 2: Focuses on Debrief
        - Question 3: Focuses on ARCC
    
      **Case Study 2:**
        - Question 1: Focuses on Validate and Verify
        - Question 2: Focuses on STAR
        - Question 3: Focuses on No Distraction Zone
    
      **Case Study 3:**
        - Question 1: Focuses on Effective Handoffs
        - Question 2: Focuses on Read and Repeat Back
        - Question 3: Focuses on Ask Clarifying Questions
    
      **Case Study 4:**
        - Question 1: Focuses on Alphanumeric Language
        - Question 2: Focuses on SBAR
        - Question 3: Focuses on STAR
    
    - **Use the following 11 Safety Behaviors and Definitions:**
    
        a. Peer Checking and Coaching
            Definition: Peer Check (Ask your colleagues to review your work and offer assistance in reviewing the work of others). Peer Coach (coach to reinforce: celebrate it publicly when someone does something correctly, coach to correct: correct someone (privately when possible) when something is done incorrectly.)
    
        b. Debrief
            Definition: Reflect on what went well with team , what didn't, how to improve, and who will follow through. All team members should freely speak up. A debrief typically lasts only 3 minutes.
      
        c. ARCC
            Definition: Ask a question to gently prompt the other person of potential safety issue, Request a change to make sure the person is fully aware of the risk. Voice a Concern if the person is resistant. Use the Chain of command if the possibility of patient harm persists.
    
        d. Validate and Verify
            Definition: An internal Check (Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information "fit in with my past experience or other information I may have at this time?). Verify (check with an independent qualified source).
    
        e. STAR
            Definition: Stop (pause for 2 seconds to focus on task at hand), Think (consider action you're about to take), Act (concentrate and carry out the task), Review (check to make sure the task was done right and you got the right result).
    
        f. No Distraction Zone
            Definition: 1) Avoid interrupting others while they are performing critical tasks 2) Avoid distractions while completing critical tasks: Use phrases like "Stand by" or "Hold on".
    
        g. Effective Handoffs
            Definition: Six important principles that make an Effective Handoffs: Standardized and streamlined, Distraction-Free Environment, Face-to-face/bedside (interactive), Acknowledgments/repeat backs, Verbal with written/ printed information, Opportunity for questions/clarification.
    
        h. Read and Repeat Back
            Definition: 1) Sender communicates information to receiver, 2) receiver listens or writes down the information and reads/repeats it back as written or heard to the sender. 3) Sender then acknowledges the accuracy of the read-back by stating "that's correct". If not correct the sender repeats/clarifies the communication beginning the three steps again.
    
        i. Ask Clarifying Questions
            Definition: Requesting Additional information, and expressing concerns to avoid misunderstandings.
    
        j. Using Alphanumeric Language
            Definition: Consists of using clear letters and numbers in communication such as replacing fifteen with one-five, and using phonetic alphabet letters instead of Latin alphabet.
    
        k. SBAR
            Definition: Situation (what is the situation, patient or project?), Background (what is important to communicate including problems and precautions?), Assessment (what is my assessment of the situation, problems, and precautions.), Recommendations (what is my recommendation, request, or plan?)
    
    Ensure the following format is strictly followed and output the entire response as valid JSON.
    
    \`\`\`json
    {
      "caseStudies": [
        {
          },
            "department" : "${department}",
            "role" : "${role}",
            "specialization": "${specialization}",
            "care": "${care}",
        },
    
          "caseStudy": "Case Study 1",
          "scenario": "Description of the case study scenario.",
          "questions": [
            {
              "question": "Question 1 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "C) correct answer",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            },
            {
              "question": "Question 2 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "b) correct answer",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            },
            {
              "question": "Question 3 text",
              "options": {
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
              },
              "correct answer": "A) correct answer ",
              "Hint": "1 sentence sumarized definition of correct answer choice."
            }
          ]
       }
        // Repeat for Case Study 2, 3, and 4
      ]
    }
    \`\`\`
    
    Ensure that:
    
    - The JSON is **well-formatted** and **free of any syntax errors**.
    - There are **no comments** (e.g., lines starting with //), **no trailing commas**, and **no additional text** outside the JSON block.
    - The JSON is enclosed within \`\`\`json and \`\`\` code fences.
    
    Do not include any additional text outside of the JSON structure.`;

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
