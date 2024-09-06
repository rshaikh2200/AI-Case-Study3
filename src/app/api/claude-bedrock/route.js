import { BedrockClient } from '@aws-sdk/client-bedrock';
import { RetrieveAndGenerateCommand } from '@aws-sdk/client-bedrock'; // Importing the command
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
      input: { text: message || systemPrompt },
      retrieveAndGenerateConfiguration: {
        type: 'KNOWLEDGE_BASE',
        knowledgeBaseConfiguration: {
          knowledgeBaseId: 'ZNMWSCRJJG', // Replace with your actual Knowledge Base ID
          modelArn: 'anthropic.claude-3-haiku-20240307-v1:0', // Replace with your model ARN
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
              overrideSearchType: 'SEMANTIC',
            },
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: systemPrompt, // Using the system prompt defined earlier
            },
            inferenceConfig: {
              textInferenceConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 512,
              },
            },
          },
          orchestrationConfiguration: {
            queryTransformationConfiguration: {
              type: 'QUERY_DECOMPOSITION',
            },
          },
        },
      },
    };

    // Construct the command correctly
    const command = new RetrieveAndGenerateCommand(input);
    const response = await bedrockClient.send(command);

    const responseText = response?.output?.text ?? 'No response from model';
    const citations = response?.citations ?? [];

    return new NextResponse(JSON.stringify({ response: responseText, citations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`ERROR: Can't invoke Retrieve and Generate. Reason: ${err.message || err}`);
    return new NextResponse(JSON.stringify({ error: `Error invoking Retrieve and Generate: ${err.message || err}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
