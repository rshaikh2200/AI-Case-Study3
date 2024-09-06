import { BedrockRuntimeClient, RetrieveandGenerateCommand } from '@aws-sdk/client-bedrock-agent-runtime'; // Correct import
import { NextResponse } from 'next/server';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' }); // Initialize the Bedrock client

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
    const { role, department, specialty } = body; // Ensure you're receiving these fields

    // Combine the system prompt with the user input (role, department, specialty)
    const prompt = `
    ${systemPrompt}
    Role: ${role}
    Department: ${department}
    Specialty: ${specialty}
    `;

    // Prepare the input for RetrieveandGenerateCommand
    const input = {
      agentId: 'anthropic.claude-3-5-sonnet-20240620-v1:0', // Replace with your model's ARN (Agent ID)
      prompt, // The generated prompt from the user inputs
      maxResults: 10, // Number of case studies and questions
      temperature: 0.7, // Model behavior (adjust as needed)
      topP: 0.9, // Nucleus sampling
      maxTokens: 512 // Ensure the token limit is sufficient for generating responses
    };

    // Use RetrieveandGenerateCommand to invoke the model and generate the response
    const command = new RetrieveandGenerateCommand(input);
    const response = await bedrockClient.send(command);

    // Assuming response contains a field with the case studies and questions
    const responseOutput = response?.output ?? 'No response from the model';

    // Parse and format the response if necessary
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseOutput); // Assuming the model returns a JSON string
    } catch (err) {
      console.error('Failed to parse model response:', err);
      return NextResponse.json({ error: 'Failed to parse model response' }, { status: 500 });
    }

    // Check if the parsedResponse has the expected structure
    if (!parsedResponse.caseStudies || !Array.isArray(parsedResponse.caseStudies)) {
      return NextResponse.json({ error: 'Unexpected response format from the model' }, { status: 500 });
    }

    return NextResponse.json({ response: parsedResponse }, { status: 200 });
  } catch (err) {
    console.error(`ERROR: Unable to generate assessment or retrieve model response. Reason: ${err.message || err}`);
    return NextResponse.json({ error: `Error: ${err.message || err}` }, { status: 500 });
  }
}
