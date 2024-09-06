import { BedrockClient } from '@aws-sdk/client-bedrock';
import { NextResponse } from 'next/server';

const bedrockClient = new BedrockClient();

const systemPrompt = `You are tasked with generating 10 summarized case studies along with 1 question per case study. Each case study should be relevant to the user's department, role, and specialty. The structure should be:
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
    const data = await req.text();

    const params = {
        modelId: 'claude-3-haiku',
        prompt: `${systemPrompt}\n\nUser Data: ${data}`,
        responseFormat: 'json',
        maxTokens: 3000, // Adjust as needed for case study and question length
        retrieveAndGenerateConfiguration: {
            type: "KNOWLEDGE_BASE",
            knowledgeBaseConfiguration: {
                knowledgeBaseId: "6XDDZFP2RK", // Ensure this is your actual Knowledge Base ID
                modelArn: "anthropic.claude-3-haiku-20240307-v1:0", // Ensure this is the correct model ARN
                retrievalConfiguration: {
                    vectorSearchConfiguration: {
                        numberOfResults: 10,
                        overrideSearchType: "SEMANTIC"
                    }
                }
            }
        }
    };

    try {
        const completion = await bedrockClient.generate(params);

        // Parse the JSON response from Amazon Bedrock
        const caseStudies = JSON.parse(completion.result);

        // Return the case studies as a JSON response
        return NextResponse.json(caseStudies.caseStudies);
    } catch (error) {
        console.error('Error generating case studies:', error);
        return NextResponse.json({ error: 'Failed to generate case studies' });
    }
}

