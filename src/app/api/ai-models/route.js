import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

// Load environment variables from the .env.local file
dotenv.config({ path: '.env.local' });

const client = new BedrockAgentRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sanitize input to prevent problematic content
const sanitizeInput = (text) => {
  const restrictedWords = ['forbiddenWord1', 'forbiddenWord2'];
  return restrictedWords.reduce((acc, word) => acc.replace(new RegExp(word, 'gi'), '***'), text);
};

export async function POST(request) {
  try {
    const { department, role, specialization } = await request.json();

    const sanitizedDepartment = sanitizeInput(department || 'General Department');
    const sanitizedRole = sanitizeInput(role || 'General Role');
    const sanitizedSpecialization = sanitizeInput(specialization || 'General Specialization');

    // Update the prompt to request 3 questions per case study
    const message = `
      Please generate 4 medical case studies (100-150 words) with a scenario where something went wrong in each case study and include 3 multiple-choice questions for each case study:
      - Case Study: A concise medical case study for a ${sanitizedRole} in the ${sanitizedDepartment} department specializing in ${sanitizedSpecialization}.
      - Questions: Create 3 multiple-choice questions for each case study, each with four options. Do not include the correct answer or any explanation.
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
              basePromptTemplate: `Here is the case study, scenario, and questions:\n$search_results$\n${message}`,
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
    const response = await client.send(command);

    // Log the raw model output to the console
    console.log('Model Output:', response.output.text);

    // Dynamic parsing - try to break the response into sections using heuristics
    const sections = response.output.text.split(/\n\s*\n/);  // Split by newlines and space

    // Identify potential case studies, scenarios, and questions
    const caseStudies = [];
    let currentCaseStudy = { caseStudy: '', scenario: '', questions: [] };
    let questionBuffer = [];

    sections.forEach((section) => {
      const lowerSection = section.toLowerCase();

      // Check if it's likely a case study section
      if (lowerSection.includes('case study')) {
        // Push the current case study and start a new one
        if (currentCaseStudy.caseStudy) {
          caseStudies.push({ ...currentCaseStudy, questions: [...questionBuffer] });
          questionBuffer = [];
        }
        currentCaseStudy = { caseStudy: section, scenario: '', questions: [] };
      } else if (lowerSection.includes('scenario')) {
        currentCaseStudy.scenario = section;
      }
      // Otherwise, assume it's a question section
      else {
        const parsedQuestions = parseQuestions(section);
        questionBuffer.push(...parsedQuestions);
      }
    });

    // Push the last case study if needed
    if (currentCaseStudy.caseStudy) {
      caseStudies.push({ ...currentCaseStudy, questions: [...questionBuffer] });
    }

    if (caseStudies.length === 0) {
      throw new Error('Failed to parse case studies, scenarios, or questions from the response.');
    }

    return NextResponse.json({ caseStudies });

  } catch (err) {
    console.error('Error invoking RetrieveAndGenerateCommand:', err.message || err);
    return NextResponse.json({
      error: `Failed to fetch case studies: ${err.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}

// Helper function to parse 3 questions from the text block
function parseQuestions(text) {
  const questionBlocks = text.split(/\n\n/).filter(block => block.trim()); // Split by double newline to separate questions
  return questionBlocks.slice(0, 3).map((block) => {  // Parse first 3 questions
    const lines = block.split('\n').filter(line => line.trim());
    const question = lines[0];
    const options = lines.slice(1, 5).map((line, index) => ({
      key: String.fromCharCode(65 + index), // A, B, C, D for options
      label: line.trim(),
    }));
    return { question, options };
  });
}

