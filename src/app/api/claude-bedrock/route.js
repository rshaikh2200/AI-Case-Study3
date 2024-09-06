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

export default async function handler(req, res) {
    try {
        // Ensure the request is a POST method
        if (req.method === 'POST') {
            // Parse request body (make sure it's JSON)
            const { department, role, specialty } = req.body;

            if (!department || !role || !specialty) {
                return res.status(400).json({ error: 'Missing required fields: department, role, specialty' });
            }

            // Prepare parameters for Bedrock
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
                                overrideSearchType: "SEMANTIC",
                            },
                        },
                    },
                },
            };

            // Log the params for debugging
            console.log("Params being sent to Bedrock:", params);

            // Call Bedrock API
            const completion = await bedrockClient.generate(params);

            if (!completion.result) {
                throw new Error('No result returned from Bedrock');
            }

            const parsedResult = JSON.parse(completion.result);

            if (!parsedResult.caseStudies) {
                throw new Error('Invalid response format from Bedrock');
            }

            // Return the case studies in response
            return res.status(200).json(parsedResult.caseStudies);
        } else {
            // Return 405 if the method is not allowed
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error generating case studies:', error.message);
        return res.status(500).json({ error: 'Failed to generate case studies', details: error.message });
    }
}
