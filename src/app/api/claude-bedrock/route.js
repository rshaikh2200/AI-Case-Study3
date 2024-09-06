import { BedrockClient, InvokeModelCommand } from '@aws-sdk/client-bedrock'; // Correct import
import { NextResponse } from 'next/server';

const bedrockClient = new BedrockClient({ region: 'us-east-1' });

const systemPrompt = `You are tasked with generating 10 summarized case studies along with 1 question per case study. The structure should be:
1. Summarize each case study with key points.
2. Generate 1 relevant question for each case study.
Return in the following JSON format:
{
  "caseStudies": [
    {
      "caseStudy": str,
      "question": str
    }
  ]
}
`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { message } = body;

    const input = {
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE", // or "EXTERNAL_SOURCES"
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "8JNS4T4ALI", // Replace with your actual Knowledge Base ID
          modelArn: "anthropic.claude-3-5-sonnet-20240620-v1:0", // Replace with your model ARN
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5, // Number of results to retrieve
              overrideSearchType: "SEMANTIC"
            }
          },
          generationConfiguration: {
            promptTemplate: {
              // Include $search_results$ to integrate the search results into the prompt
              textPromptTemplate: "You are a helpful AI assistant for Crescent Technology. This is data you're given about Crescent: $search_results$. Be concise and keep the message close to 20 words."
            },
            inferenceConfig: {
              textInferenceConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 512,
                // stopSequences: ["\n"] 
              }
            },
          },
          orchestrationConfiguration: {
            queryTransformationConfiguration: {
              type: "QUERY_DECOMPOSITION", 
            }
          }
        },
      },
    };

    const command = new InvokeModelCommand(input); // Ensure correct API call
    const response = await bedrockClient.send(command);

    const responseText = response?.output?.toString() ?? 'No response from model';

    return NextResponse.json({ response: responseText }, { status: 200 });
  } catch (err) {
    console.error(`ERROR: Can't invoke model. Reason: ${err.message || err}`);
    return NextResponse.json({ error: `Error invoking model: ${err.message || err}` }, { status: 500 });
  }
}
