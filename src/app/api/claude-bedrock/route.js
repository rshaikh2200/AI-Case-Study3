import { BedrockClient } from '@aws-sdk/client-bedrock'; // Correct import
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
      input: { 
        text: message || systemPrompt 
      },
      retrieveAndGenerateConfiguration: { 
        externalSourcesConfiguration: { 
          generationConfiguration: { 
           
            inferenceConfig: { 
              textInferenceConfig: { 
                maxTokens: 512,
                stopSequences: [ "." ],
                temperature: 0.7,
                topP: 0.9
              }
            },
            promptTemplate: { 
              textPromptTemplate: systemPrompt
            }
          },
          modelArn: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Replace with your model ARN
          sources: [ 
            { 
              sourceType: "S3",
              s3Location: { 
                uri: "s3://casestudyai"
              }
            }
          ]
        },
        knowledgeBaseConfiguration: { 
          generationConfiguration: { 
            },
        
            inferenceConfig: { 
              textInferenceConfig: { 
                maxTokens: 512,
                stopSequences: [ "." ],
                temperature: 0.7,
                topP: 0.9
              }
            },
            promptTemplate: { 
              textPromptTemplate: systemPrompt
            }
          },
          knowledgeBaseId: '8JNS4T4ALI', // Replace with your actual Knowledge Base ID
          modelArn: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Replace with your model ARN
          orchestrationConfiguration: { 
            queryTransformationConfiguration: { 
              type: 'QUERY_DECOMPOSITION'
            }
          },
          retrievalConfiguration: { 
            vectorSearchConfiguration: { 
              numberOfResults: 5,
              overrideSearchType: 'SEMANTIC'
            }
          }
        },
        type: 'KNOWLEDGE_BASE'
      }
    

    const command = new InvokeModelCommand(input); // Ensure correct API call
    const response = await bedrockClient.send(command);

    const responseText = response?.body?.toString() ?? 'No response from model';

    return new NextResponse(JSON.stringify({ response: responseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`ERROR: Can't invoke model. Reason: ${err.message || err}`);
    return new NextResponse(JSON.stringify({ error: `Error invoking model: ${err.message || err}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
