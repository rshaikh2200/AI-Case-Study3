import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

// Load environment variables from the .env.local file
dotenv.config({ path: 'src/.env.local' });

// Initialize Bedrock client with credentials from the environment
const client = new BedrockAgentRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sanitize input to prevent problematic content
const sanitizeInput = (text) => {
  const restrictedWords = ['forbiddenWord1', 'forbiddenWord2']; // Add more restricted words if necessary
  return restrictedWords.reduce((acc, word) => acc.replace(new RegExp(word, 'gi'), '***'), text);
};

export async function POST(request) {
  try {
    // Parse incoming request body
    const { department, role, specialization } = await request.json();

    // Sanitize input values
    const sanitizedDepartment = sanitizeInput(department || 'General Department');
    const sanitizedRole = sanitizeInput(role || 'General Role');
    const sanitizedSpecialization = sanitizeInput(specialization || 'General Specialization');

    // Construct prompt message for the AI model
    const message = `
      Please generate the following:
      - The Case: A concise medical case study for a ${sanitizedRole} in the ${sanitizedDepartment} department specializing in ${sanitizedSpecialization}.
      - Questions: Create 4 multiple-choice question with four options based on safety core principles. Do not include the correct answer or any explanation. Only provide the case study and the question with its options.
    `;

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
              basePromptTemplate: `Here is the case study and question information:\n$search_results$\n${message}`,
              inferenceConfig: {
                textInferenceConfig: {
                  temperature: 0.5,
                  topP: 0.8,
                  maxTokens: 1024,
                },
              },
            },
          },
        },
      },
    };

    // Log the constructed command to verify correct parameters
    console.log('RetrieveAndGenerateCommand Input:', input);

    // Send the command to Amazon Bedrock
    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);

    // Log the response for debugging purposes
    console.log('Full Response from Bedrock:', response);

    // Extract the relevant parts from the response
    const caseStudyMatch = response.output.text.match(/The Case:(.*)Questions:/s);
    const questionsMatch = response.output.text.match(/Questions:(.*)/s);

    if (!caseStudyMatch || !questionsMatch) {
      throw new Error("Could not parse case study or questions from the model output.");
    }

    const caseStudy = caseStudyMatch[1].trim();
    const questionsText = questionsMatch[1].trim();

    // Generate an image based on the case study
    const imageResponse = await generateImageFromCaseStudy(caseStudy);
    if (imageResponse.error) {
      return NextResponse.json({ error: imageResponse.error }, { status: 500 });
    }

    // Return the parsed case study, questions, and image URL in a formatted manner
    return NextResponse.json({
      caseStudy: formatCaseStudy(caseStudy),
      questions: parseQuestions(questionsText),
      imageUrl: imageResponse.imageUrl,
    });

  } catch (err) {
    // Log the detailed error for debugging
    console.error('Error invoking RetrieveAndGenerateCommand:', err.message || err);

    // Ensure a valid JSON response with proper error message
    return NextResponse.json({
      error: `Failed to fetch case studies: ${err.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}

// Updated helper function to handle multiple questions
function parseQuestions(text, questionCount = 4) {
  const lines = text.split('\n').filter(line => line.trim());
  const questions = [];
  
  let currentQuestionIndex = 0;

  while (currentQuestionIndex < lines.length && questions.length < questionCount) {
    const questionText = lines[currentQuestionIndex];
    const options = lines.slice(currentQuestionIndex + 1, currentQuestionIndex + 5).map((line, index) => ({
      key: String.fromCharCode(65 + index), // A, B, C, D for options
      label: line.trim(),
    }));
    questions.push({ question: questionText, options });
    currentQuestionIndex += 5; // Move to the next question block
  }

  return questions;
}

function formatCaseStudy(caseStudyText) {
  // Remove any unnecessary labels or repeated headers
  return caseStudyText.replace(/The Case:/gi, '').trim();
}

// Use the case study as the prompt for image generation using OpenAI API
async function generateImageFromCaseStudy(caseStudy) {
  const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: caseStudy, // Use only the case study part for image generation
      size: "1024x1024", // Customize size if needed
      n: 1, // Number of images
    }),
  });

  const imageData = await openAiResponse.json();

  // Handle errors from OpenAI
  if (!openAiResponse.ok) {
    return { error: imageData.error?.message || "Failed to generate image." };
  }

  return { imageUrl: imageData.data[0]?.url };
}
