import { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';

// Load environment variables from .env file located in src directory
dotenv.config({ path: 'src/.env.local' });

// Initialize Bedrock client with credentials from the environment
const client = new BedrockAgentRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function POST(request) {
  try {
    const { department, role, specialization } = await request.json();

    const message = `
      Generate a concise medical case study for a ${role} in the ${department} department specializing in ${specialization}.
      The case study should be 100-150 words and include relevant details from the following search results:
      
      $search_results$

      Format the case study as follows:
      The Case:
      A 38-year-old female with no past medical history presented with fevers, respiratory failure, and bilateral pulmonary infiltrates. She developed ARDS. 
      AFB cultures grew Mycobacterium tuberculosis after broad-spectrum antibiotics failed.

      After the case study, create 3 multiple-choice questions with four options (a, b, c, d) based on these core principles. 
      The data for hospitals core safety principles and all relevant details can be found from the following search results: $search_results$;
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
              overrideSearchType: "SEMANTIC"
            }
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: message,
              inferenceConfig: {
                textInferenceConfig: {
                  temperature: 0.5, // Reduced temperature for more deterministic responses
                  topP: 0.8,
                  maxTokens: 1024
                }
              }
            }
          }
        }
      }
    };

    const command = new RetrieveAndGenerateCommand(input);
    const response = await client.send(command);

    // Log the response to see if it's structured as expected
    console.log('Full Response from Bedrock:', response);

    const responseText = response.output?.text || "No response from model";

    if (!responseText || responseText.includes("Sorry")) {
      throw new Error("Model unable to process the request.");
    }

    const caseStudyStart = responseText.indexOf("The Case:");
    const questionsStart = responseText.indexOf("Questions:");

    if (caseStudyStart === -1 || questionsStart === -1) {
      console.warn("Incomplete response detected. Logging full response for debugging.");
      return NextResponse.json({ 
        caseStudy: "No case study generated", 
        questions: "No questions generated", 
        warning: "Model did not generate a complete response" 
      });
    }

    const caseStudy = responseText.substring(caseStudyStart, questionsStart).trim();
    const questionsText = responseText.substring(questionsStart).trim();
    const questionBlocks = questionsText.split(/\d\./).slice(1);

    const formattedQuestions = questionBlocks.map((block) => {
      const [questionText, ...options] = block.split(/[a-d]\./).map((str) => str.trim());
      return {
        question: questionText,
        options: options.map((option, i) => ({
          label: option,
          key: String.fromCharCode(97 + i),
        })),
      };
    });

    return NextResponse.json({
      caseStudy: caseStudy || 'No case study generated',
      questions: formattedQuestions.length > 0 ? formattedQuestions : 'No questions generated',
    });
  } catch (err) {
    console.error(`Error invoking Retrieve and Generate: ${err.message || err}`);
    return NextResponse.json({ error: `Error invoking Retrieve and Generate: ${err.message || err}` }, { status: 500 });
  }
}