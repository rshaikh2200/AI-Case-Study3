import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data'; // Ensure FormData is imported

dotenv.config({ path: '.env.local' });

const errorPreventionTools = `
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
k. SBAR (Situation, Background, Assessment, Recommendation)
`;

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
  return restrictedWords.reduce((acc, word) => acc.replace(new RegExp(word, 'gi'), '***'), text);
};

// Sanitize the scenario for safe image generation (specific to Case Study 3)
function sanitizeScenario(scenario) {
  const restrictedWords = [
    'error', 'failure', 
  ];
  let sanitizedScenario = scenario;

  restrictedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitizedScenario = sanitizedScenario.replace(regex, 'issue');
  });

  sanitizedScenario = sanitizedScenario.replace(/(severe pain|irreversible damage|long-term disability|failed to recognize|muscle and nerve damage)/gi, 
  'discomfort, functional issues, delayed diagnosis, and long-term functional limitations');


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
    const { department = 'General Department', role = 'General Role', specialization = 'General Specialization' } = await request.json();

    const sanitizedDepartment = sanitizeInput(department);
    const sanitizedRole = sanitizeInput(role);
    const sanitizedSpecialization = sanitizeInput(specialization);

    const message = `Please generate 4 medical case studies (150 words) and include 3 multiple-choice questions for each case study:
      - A medical case study for a ${sanitizedRole} in the ${sanitizedDepartment} department specializing in ${sanitizedSpecialization}.
      - Create 3 case study based unique multiple-choice questions for each case study with 4 options. Each question should only focus on one specific ${errorPreventionTools}, and how they could have been used to prevent the error in the case study. The questions should not use the same error prevention tools. Do not include hospital implementation to fix solution only the case.`;


    const input = {
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "8JNS4T4ALI",
          modelArn: "anthropic.claude-3-haiku-20240307-v1:0",
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
              overrideSearchType: "SEMANTIC",
            },
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: `Please use the following information:\n$search_results$\n${message}`,
              basePromptTemplate: `Here is the case studies, error prevention tools list :\n$search_results$\n${message}`,
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

    console.log("Model Response:", response);

    if (!response?.output?.text) {
      throw new Error('No valid text found in the model response.');
    }

    const caseStudies = parseCaseStudies(response.output.text);

    if (caseStudies.length === 0) {
      throw new Error('Failed to parse case studies, scenarios, or questions from the response.');
    }

    console.log("Case studies parsed successfully. Now generating images...");

    // Call the defined function to fetch images
    const caseStudiesWithImages = await fetchImagesForCaseStudies(caseStudies);

    return NextResponse.json({ caseStudies: caseStudiesWithImages });

  } catch (err) {
    console.error('Error invoking RetrieveAndGenerateCommand:', err.message || err);
    return NextResponse.json({
      error: `Failed to fetch case studies: ${err.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}

// Parse case studies and questions from the model response
function parseCaseStudies(responseText) {
  const caseStudies = [];
  const caseStudyBlocks = responseText.split(/Case Study \d+:/g).filter(Boolean);

  caseStudyBlocks.forEach((block, index) => {
    let [scenario, ...questionsBlock] = block.split('Questions:').map(section => section.trim());

    scenario = scenario
      .replace(/^[^\n]+\n/, '')
      .replace(/\nMultiple Choice Questions:\n/, '')
      .replace(/Specialization: [^\n]+\n/g, '')
      .replace(/Case Summary:/, '')
      .replace(/Multiple-Choice Questions:/, '') 
      .trim();

    const questions = parseQuestions(questionsBlock.join('Questions:'));

    caseStudies.push({
      caseStudy: `Case Study ${index + 1}`,
      scenario: scenario.trim(),
      questions: questions,
    });
  });

  return caseStudies;
}

// Parse questions from the text block
function parseQuestions(text) {
  if (!text) return [];

  const questionBlocks = text.split(/\n\n/).filter(block => block.trim());
  return questionBlocks.slice(0, 3).map((block) => {
    const lines = block.split('\n').filter(line => line.trim());

    const question = lines[0].replace(/^\d+\.\s*/, '').trim();

    const options = lines.slice(1, 5).map((line, index) => ({
      key: String.fromCharCode(65 + index), 
      label: line.trim(),
    }));

    return { question, options };
  });
}

// Define fetchImagesForCaseStudies function
async function fetchImagesForCaseStudies(caseStudies, model = "sd3-large-turbo", aspect_ratio = "1:1") {
  try {
    const responses = await Promise.all(
      caseStudies.map(async (caseStudy) => {
        try {
          // Sanitize the scenario
          const sanitizedScenario = sanitizeScenario(caseStudy.scenario);
          
          // Trim the sanitized scenario to 15-20 words
          const trimmedScenario = trimToWordCount(sanitizedScenario, 15, 20);

          const payload = {
            prompt: trimmedScenario, // Use trimmed scenario
            output_format: "jpeg",
            model,
            aspect_ratio,
            width: 32,   
            height: 32,  
          };

          const formData = new FormData();
          Object.keys(payload).forEach(key => formData.append(key, payload[key]));

          const response = await axios.post(
            `https://api.stability.ai/v2beta/stable-image/generate/sd3`,
            formData,
            {
              validateStatus: undefined,
              responseType: "arraybuffer",
              headers: {
                Authorization: `Bearer ${process.env.STABILITY_API_KEY}`, // Secure your API key in environment variables
                Accept: "image/*",
              },
            }
          );

          if (response.status === 200) {
            const base64Image = Buffer.from(response.data).toString('base64');
            return { ...caseStudy, imageUrl: `data:image/jpeg;base64,${base64Image}` };
          } else {
            console.warn(`Failed to generate image for Case Study: ${caseStudy.caseStudy}. Error: ${response.status}`);
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



