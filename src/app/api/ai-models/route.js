// route.js

import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export const dynamic = 'force-dynamic';

// Parsing function to extract and validate case studies
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

export async function POST(request) {
  // Retrieve the API keys and environment variables from environment
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
  const PINECONE_ENV = process.env.PINECONE_ENVIRONMENT;

  const pc = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });
  const index = pc.Index('rag-riz').namespace('ns1');

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  // Extract request body
  const { department, role, specialization } = await request.json();
  const query = `Department: ${department}, Role: ${role}, Specialization: ${specialization}`;

  // Create an embedding for the input query
  let queryEmbedding;
  try {
    const embeddingResponse = await openai.embeddings.create({
      input: query,
      model: 'text-embedding-ada-002',
    });

    if (!embeddingResponse.data || !Array.isArray(embeddingResponse.data) || embeddingResponse.data.length === 0) {
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

 
  let similarCaseStudies = [];
  try {
    const pineconeResponse = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    similarCaseStudies = pineconeResponse.matches.map((match) => match.metadata.content);
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve similar case studies from Pinecone.' },
      { status: 500 }
    );
  }

  const retrievedCasesText = similarCaseStudies.join('\n');

  const META_PROMPT = `Please generate 4 medical case studies (250 words) and include 3 multiple-choice questions for each case study. Use the following ${retrievedCasesText} to help generate medical case studies:
    - A medical case study for a ${role} in the ${department} department specializing in ${specialization}.  Each case study should include a different medical error (ex: a instrument left within patient, missing items, bioburden, burn events, isntrument malfunction, shift change, site markings, consent, miscoummunication) that occured, however it should not include what steps were taken to resolve the issue by team or individual only provide the scenario. The case studies should incorporate characters with diverse names, and genders. 
    - Create 3 unique multiple-choice questions for each case study with 4 options. Each question should strictly focus on a different error prevention approach and how it could have been applied to prevent the error in the case study. Ensure the questions explore different approaches without explicitly listing the prevention tools by name in the question header. 
    a. Peer Checking and Coaching
    b. Debrief
    c. ARCC (Ask a question, Request a change, voice concern if needed, Stop the line, and activate the chain of command)
    d. Validate and Verify
    e. STAR (Stop, Think, Act, Review)
    f. No Distraction Zone
    g. Effective Handoffs
    h. Read and Repeat Backs; request and give acknowledgement
    i. Ask clarifying questions
    j. Using Alpha Numeric language
    k. SBAR (Situation, Background, Assessment, Recommendation
    
    Ensure the following format is strictly followed and output the entire response as valid JSON.

\\\`\\\`\\\`json
{
  "caseStudies": [
    {
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
          }
        },
        {
          "question": "Question 2 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
        },
        {
          "question": "Question 3 text",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          }
        }
      ]
    }
    // Repeat for Case Study 2, 3, and 4
  ]
}
\\\`\\\`\\\`

**Example:**

\\\`\\\`\\\`json
{
  "caseStudies": [
    {
      "caseStudy": "Case Study 1",
      "scenario": "Mr. Nitesh Patel, a 65 year old patient underwent a total knee replacement surgery for severe osteoarthritis. During the procedure, Brent Keeling a respected orthopedic surgeon noted difficulty in exposing the joint due to significant scarring from the patient's previous knee surgeries. Towards the end of the procedure, the patient complained of numbness and weakness in the foot. Postoperative imaging revealed a stretch injury to the common personeal nerve." The case studies should incorporate health equity with diverse names, and genders
      "questions": [
        {
          "question": "What error prevention approach could have been applied to prevent the delay in diagnosis?",
          "options": {
            "A": "Peer Checking and Coaching",
            "B": "Debrief",
            "C": "ARCC",
            "D": "Validate and Verify"
          }
        },
        {
          "question": "Which approach focuses on stopping the line to address concerns immediately?",
          "options": {
            "A": "STAR",
            "B": "No Distraction Zone",
            "C": "ARCC",
            "D": "Effective Handoffs"
          }
        },
        {
          "question": "How can effective handoffs prevent such errors in the future?",
          "options": {
            "A": "By asking clarifying questions",
            "B": "By using Alpha Numeric language",
            "C": "By implementing SBAR",
            "D": "All of the above"
          }
        }
      ]
    }
    // Additional case studies...
  ]
}
\\\`\\\`\\\`

Ensure that:

- The JSON is **well-formatted** and **free of any syntax errors**.
- There are **no comments** (e.g., lines starting with \\\`//\\\`), **no trailing commas**, and **no additional text** outside the JSON block.
- The JSON is enclosed within \\\`\\\`\\\`json and \\\`\\\`\\\` code fences.

Do not include any additional text outside of the JSON structure.`;

  try {
    // Make a request to OpenAI's Chat Completion API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use 'gpt-4' if you have access
      messages: [
        {
          role: 'system',
          content: META_PROMPT,
        },
      ],
      temperature: 0,
      max_tokens: 4000,
      stream: false,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('No choices returned from OpenAI.');
    }

    const aiResponse = response.choices[0].message.content;

    if (!aiResponse) {
      throw new Error('No content returned from OpenAI.');
    }

    // Parse the AI response using parseCaseStudies
    const parsedCaseStudies = parseCaseStudies(aiResponse);

    return NextResponse.json({ caseStudies: parsedCaseStudies });
  } catch (error) {
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// Function to generate image prompt via OpenAI
async function generateImagePrompt(caseStudy) { // Accept caseStudy as parameter
  // Customize META_PROMPT using caseStudy.scenario if needed
  // Here, we'll keep META_PROMPT as a fixed system prompt and use caseStudy.scenario in the user message
  const META_PROMPT = `
You are an expert prompt engineer tasked with creating detailed and descriptive prompts for image generation based on given scenarios. Your prompts should be clear, vivid, and free of any NSFW (Not Safe For Work) content. Ensure that the prompts are suitable for use with image generation models and accurately reflect the provided scenario.

# Guidelines

- **Understand the Scenario**: Carefully read the provided scenario to grasp the context, key elements, and desired visual aspects.
- **Detail and Clarity**: Include specific details such as settings, characters, objects, actions, and emotions to create a vivid image in the mind of the image generation model.
- ** Realistic **: Make sure each character and object visible in the image do not overlap, and each character should have a full and realistic body. Make sure all body parts, veins, and etc are correct associated with correct object and character. Make sure everything look as realistic as possible.
- **Avoid NSFW Content**: Ensure that the prompt does not contain or imply any inappropriate, offensive, or unsafe content.
- **Language and Tone**: Use clear and concise language. Maintain a neutral and professional tone.
- **Formatting**: Present the prompt as a single, well-structured paragraph without any markdown or code blocks.
- **Consistency**: Maintain consistency in descriptions, avoiding contradictions or vague terms.
- **Descriptive Adjectives**: Utilize descriptive adjectives to enhance the visual richness of the prompt.
- **Characters**: Characters should consist of different race, gender, and relegions.

# Steps

1. **Analyze the Scenario**: Identify the main elements such as location, characters, objects, and actions.
2. **Expand on Details**: Add descriptive elements to each identified component to enrich the prompt.
3. **Ensure Appropriateness**: Review the prompt to eliminate any NSFW content or implications.
4. **Finalize the Prompt**: Ensure the prompt is cohesive, vivid, and suitable for image generation.

# Output Format

- **Format**: Plain text paragraph.
- **Length**: Approximately 20 - 30 words, providing sufficient detail without being overly verbose.
- **Style**: Descriptive and clear, suitable for feeding directly into an image generation model.

# Example

**Image Prompt**:
"A bustling hospital emergency room at night, illuminated by bright overhead lights. Doctors and nurses in white coats move swiftly between beds, attending to patients with focused expressions. Medical equipment and monitors line the walls, while the atmosphere is tense yet organized, reflecting the urgency of a busy night shift."

# Notes

- **Edge Cases**: If the scenario is abstract or lacks detail, infer reasonable visual elements to create a coherent prompt.
- **Cultural Sensitivity**: Be mindful of cultural nuances and avoid stereotypes or biased representations.
- **No NSFW Content**: Double-check to ensure the prompt adheres to safety guidelines and does not contain any inappropriate content.
`.trim();

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured.");
  }

  // Optionally trim the scenario if needed
  const trimmedScenario = trimToWordCount(caseStudy.scenario, 15, 20);

  // Validate the scenario
  if (typeof caseStudy.scenario !== 'string' || caseStudy.scenario.trim() === '') {
    throw new Error("Invalid scenario provided to generateImagePrompt.");
  }


  // Call the OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: META_PROMPT,
        },
        {
          role: "user",
          content: "Scenario:\n" + caseStudy.scenario, // Use caseStudy.scenario
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI API Error:", errorData);
    throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const generatedPrompt = data.choices[0]?.message?.content;

  if (!generatedPrompt) {
    throw new Error("No prompt generated by OpenAI.");
  }

  return { prompt: generatedPrompt };
}

// Define fetchImagesForCaseStudies function
async function fetchImagesForCaseStudies(
  caseStudies,
  model = 'sd3-large-turbo',
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

          const generatedPrompt = caseStudy.imagePrompt; // Corrected Line

          const payload = {
            prompt: generatedPrompt, // Use the correct prompt
            output_format: 'jpeg',
            model,
            aspect_ratio,
            width: 512, // Increased width for better quality
            height: 512, // Increased height for better quality
          };

          const formData = new FormData();
          Object.keys(payload).forEach((key) =>
            formData.append(key, payload[key])
          );

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
              `Failed to generate image for Case Study: ${caseStudy.caseStudy}. Error: ${response.status}`
            );
            return { ...caseStudy, imageUrl: null };
          }
        } catch (error) {
          console.error('Error generating image:', error.message);
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
