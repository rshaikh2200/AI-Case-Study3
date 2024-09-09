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
      The case study should be 100-150 words and include relevant details from the following search results: $search_results$. 
      Format the case study as follows:
      The Case:
      
      After the case study, create 1 multiple-choice question with four options (a, b, c, d) based on the safety core principles. All relevant data and relevant details for producing questions based on safety core principles can be found by the following search results $search_results$; Format the questions as follow:
      
      Question: 
      A)
      B)
      C)
      D) 

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

    const responseText = response.output?.text ?? "No response from model";

    if (!responseText || responseText.includes("Sorry")) {
      throw new Error("Model unable to process the request.");
    }

    // Get the part of the response starting from "The Case:"
    const caseStudyStart = responseText.indexOf("The Case:");
    if (caseStudyStart === -1) {
      console.warn("No case study section found in the response.");
      return NextResponse.json({ 
        caseStudy: "No case study generated", 
        questions: "No questions generated", 
        warning: "Model did not generate a case study" 
      });
    }

    // Extract the case study part from the response text
    const caseStudy = responseText.substring(caseStudyStart).trim();

    // Use the case study as the prompt for image generation using OpenAI API
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
      return NextResponse.json({ error: imageData.error?.message || "Failed to generate image." }, { status: openAiResponse.status });
    }

    const imageUrl = imageData.data[0]?.url;

    // Return the case study and image URL as response
    return NextResponse.json({
      caseStudy: caseStudy || 'No case study generated',
      imageUrl: imageUrl || 'No image generated',
    });
  } catch (err) {
    console.error(`Error invoking Retrieve and Generate or OpenAI Image Generation: ${err.message || err}`);
    return NextResponse.json({ error: `Error invoking Retrieve and Generate or Image Generation: ${err.message || err}` }, { status: 500 });
  }
}
