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
    try {
        const data = await req.text();

        const params = {
            modelId: 'claude-3-haiku',
            prompt: `${systemPrompt}`,
            responseFormat: 'json',
            maxTokens: 3000, 
            retrieveAndGenerateConfiguration: {
                type: "KNOWLEDGE_BASE",
                knowledgeBaseConfiguration: {
                    knowledgeBaseId: "6XDDZFP2RK", 
                    modelArn: "anthropic.claude-3-haiku-20240307-v1:0",
                    retrievalConfiguration: {
                        vectorSearchConfiguration: {
                            numberOfResults: 10,
                            overrideSearchType: "SEMANTIC"
                        }
                    }
                }
            }
        };

        const completion = await bedrockClient.generate(params);
        
        if (!completion.result) {
            throw new Error('No result returned from Bedrock');
        }

        // Parse the JSON response safely
        const parsedResult = JSON.parse(completion.result);
        
        if (!parsedResult.caseStudies) {
            throw new Error('Invalid response format from Bedrock');
        }

        // Return the case studies as a JSON response
        return NextResponse.json(parsedResult.caseStudies);
    } catch (error) {
        console.error('Error generating case studies:', error);
        return NextResponse.json({ error: 'Failed to generate case studies' });
    }
}
