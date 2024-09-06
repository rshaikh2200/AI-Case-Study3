import { BedrockRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime'; // Updated import
import { NextResponse } from 'next/server';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' }); // Initialize the Bedrock runtime client

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
      agentId: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Replace with the actual agent ID (model ARN)
      text: message,  // Input text for the model
      maxResults: 10, // Number of case studies you want
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 512
    };

    const command = new InvokeAgentCommand(input); // Updated to use InvokeAgentCommand
    const response = await bedrockClient.send(command);

    const responseText = response?.output ?? 'No response from model'; // Adjust to match response structure

    return NextResponse.json({ response: responseText }, { status: 200 });
  } catch (err) {
    console.error(`ERROR: Can't invoke model. Reason: ${err.message || err}`);
    return NextResponse.json({ error: `Error invoking model: ${err.message || err}` }, { status: 500 });
  }
}
