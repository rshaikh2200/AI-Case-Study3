// route.js for generating case studies and images

import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate essential environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'OPENAI_API_KEY',
  'STABILITY_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Initialize Bedrock client
const bedrockClient = new BedrockAgentRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sanitize input to prevent problematic content
const sanitizeInput = (text = '') => {
  const restrictedWords = ['forbiddenWord1', 'forbiddenWord2'];
  return restrictedWords.reduce(
    (acc, word) => acc.replace(new RegExp(word, 'gi'), '***'),
    text
  );
};

// Sanitize the scenario for safe image generation (specific to Case Study 3)
function sanitizeScenario(scenario) {
  const restrictedWords = ['error', 'failure'];
  let sanitizedScenario = scenario;

  restrictedWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitizedScenario = sanitizedScenario.replace(regex, 'issue');
  });

  sanitizedScenario = sanitizedScenario.replace(
    /(severe pain|irreversible damage|long-term disability|failed to recognize|muscle and nerve damage)/gi,
    'discomfort, functional issues, delayed diagnosis, and long-term functional limitations'
  );

  return sanitizedScenario;
}

// Helper function to trim text to 15-20 words
function trimToWordCount(text, minWords = 15, maxWords = 20) {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount <= maxWords) {
    // If word count is within the limit, return as is
    return text;
  }

  // Trim to the maximum word limit
  const trimmed = words.slice(0, maxWords).join(' ');
  return `${trimmed}...`; // Add ellipsis to indicate trimming
}

export async function POST(request) {
  try {
    const {
      department = 'General Department',
      role = 'General Role',
      specialization = 'General Specialization',
    } = await request.json();

    const sanitizedDepartment = sanitizeInput(department);
    const sanitizedRole = sanitizeInput(role);
    const sanitizedSpecialization = sanitizeInput(specialization);

    const message = `Please generate 4 medical case studies (150 words) and include 3 multiple-choice questions for each case study:
    - A medical case study for a ${sanitizedRole} in the ${sanitizedDepartment} department specializing in ${sanitizedSpecialization}.
    - Create 3 unique multiple-choice questions for each case study with 4 options. Each question should focus on a different error prevention approach and how it could have been applied to prevent the error in the case study. Ensure the questions explore different approaches without explicitly listing the prevention tools by name in the question header. Do not include hospital implementation to fix solution, only the case itself.
    Here are the approaches to incorporate:
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
    k. SBAR (Situation, Background, Assessment, Recommendation)`;

    const input = {
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: '8JNS4T4ALI',
          modelArn: 'anthropic.claude-3-haiku-20240307-v1:0',
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
              overrideSearchType: 'SEMANTIC',
            },
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: `Please use the following information:\n$search_results$\n${message}`,
              basePromptTemplate: `Here is the case studies, and 11 error prevention tools :\n$search_results$\n${message}`,
              inferenceConfig: {
                textInferenceConfig: {
                  temperature: 0.5,
                  topP: 0.8,
                  maxTokens: 2048,
                },
              },
            },
          },
        },
      },
    };

    const command = new RetrieveAndGenerateCommand(input);
    const response = await bedrockClient.send(command);

    console.log('Model Response:', response);

    if (!response?.output?.text) {
      throw new Error('No valid text found in the model response.');
    }

    const caseStudies = parseCaseStudies(response.output.text);

    if (caseStudies.length === 0) {
      throw new Error(
        'Failed to parse case studies, scenarios, or questions from the response.'
      );
    }

    console.log('Case studies parsed successfully. Now generating image prompts...');

    // Generate image prompts via OpenAI for each case study
    const caseStudiesWithImagePrompts = await Promise.all(
      caseStudies.map(async (caseStudy) => {
        try {
          const imagePromptResponse = await generateImagePrompt(caseStudy); // Pass entire caseStudy
          const generatedImagePrompt = imagePromptResponse.prompt;

          console.log(`Generated Image Prompt for ${caseStudy.caseStudy}:`, generatedImagePrompt);

          return {
            ...caseStudy,
            imagePrompt: generatedImagePrompt,
          };
        } catch (error) {
          console.error(`Error generating image prompt for ${caseStudy.caseStudy}:`, error.message);
          return { ...caseStudy, imagePrompt: null };
        }
      })
    );

    // Now fetch images using the generated image prompts
    const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudiesWithImagePrompts);

    return NextResponse.json({ caseStudies: caseStudiesWithImages });
  } catch (err) {
    console.error('Error invoking RetrieveAndGenerateCommand:', err.message || err);
    return NextResponse.json(
      {
        error: `Failed to fetch case studies: ${err.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

function parseCaseStudies(responseText) {
  const caseStudies = [];
  const caseStudyBlocks = responseText.split(/Case Study \d+:/g).filter(Boolean);

  caseStudyBlocks.forEach((block, index) => {
    const sections = block.split(/Question \d+/).map((section) => section.trim());
    let scenario = sections[0]; // The case study scenario text

    scenario = scenario
      .replace(/^[^\n]+\n/, '')
      .replace(/\nMultiple Choice Questions:\n/, '')
      .replace(/Specialization: [^\n]+\n/g, '')
      .replace(/Case Summary:/, '')
      .replace(/Multiple-Choice Questions:/, '')
      .trim();

    // Format each question
    const questions = sections.slice(1).map((section, qIndex) => {
      const [questionText, ...options] = section.split('\n').filter(Boolean);

      const formattedOptions = options.map((option, idx) => ({
        key: String.fromCharCode(65 + idx), // 'A', 'B', 'C', 'D'
        label: option.replace(/^[a-eA-E][\.\)]\s*/, '').trim(), // Remove any leading letters and symbols
      }));

      // Clean up the question text by removing any leading 'Question X:' and colons
      const cleanQuestionText = questionText
        .replace(/^Question\s*\d*:\s*/, '') // Remove any 'Question X:' prefix
        .replace(/^:\s*/, '') // Remove any leading colons
        .replace(/^[a-eA-E]\.\s*/, '') // Remove any 'a. ', 'b. ', etc.
        .trim();

      return {
        question: `Question ${qIndex + 1}: ${cleanQuestionText}`,
        options: formattedOptions,
      };
    });

    caseStudies.push({
      caseStudy: `Case Study ${index + 1}`,
      scenario: scenario.trim(),
      questions: questions,
    });
  });

  return caseStudies;
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
  - **Avoid NSFW Content**: Ensure that the prompt does not contain or imply any inappropriate, offensive, or unsafe content.
  - **Language and Tone**: Use clear and concise language. Maintain a neutral and professional tone.
  - **Formatting**: Present the prompt as a single, well-structured paragraph without any markdown or code blocks.
  - **Consistency**: Maintain consistency in descriptions, avoiding contradictions or vague terms.
  - **Descriptive Adjectives**: Utilize descriptive adjectives to enhance the visual richness of the prompt.

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

  console.log("Scenario passed to generateImagePrompt:", caseStudy.scenario);

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

  // Log the generated prompt to console
  console.log("Generated Image Prompt:", generatedPrompt);

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





