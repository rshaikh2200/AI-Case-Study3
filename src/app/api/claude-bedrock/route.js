import { BedrockAgentRuntimeClient, RetrieveandGenerateCommand } from '@aws-sdk/client-bedrock-agent-runtime'; // Import the correct client and command
import { NextResponse } from 'next/server';

const bedrockClient = new BedrockAgentRuntimeClient({ region: 'us-east-1' }); // Initialize the correct client

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
      agentId: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Replace with the correct agent ID (model ARN)
      prompt: systemPrompt + message,  // Combine the system prompt with user input
      maxResults: 10, // Specify how many case studies to generate
      temperature: 0.7, // Adjust model behavior
      topP: 0.9,
      maxTokens: 512 // Limit the number of tokens generated
    };

    const command = new RetrieveandGenerateCommand(input); // Use RetrieveandGenerateCommand for retrieval and generation
    const response = await bedrockClient.send(command);

    const responseText = response?.output ?? 'No response from model'; // Handle model response

    return NextResponse.json({ response: responseText }, { status: 200 });
  } catch (err) {
    console.error(`ERROR: Can't invoke model. Reason: ${err.message || err}`);
    return NextResponse.json({ error: `Error invoking model: ${err.message || err}` }, { status: 500 });
  }
}
