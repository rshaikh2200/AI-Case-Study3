"use client";

import { BedrockClient } from '@aws-sdk/client-bedrock'; // Correct import
import { NextResponse } from 'next/server';
import { useState } from 'react';

// Assuming BedrockClient is correctly initialized
const bedrockClient = new BedrockClient({ region: 'us-east-1' });

export async function POST(req) {
  try {
    const body = await req.json();
    const { message } = body;

    const input = {
      input: { text: message },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: "8JNS4T4ALI", // Replace with your actual Knowledge Base ID
          modelArn: "anthropic.claude-3-5-sonnet-20240620-v1:0", // Replace with your model ARN
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 5,
              overrideSearchType: "SEMANTIC"
            }
          },
          generationConfiguration: {
            promptTemplate: {
              textPromptTemplate: "You are a helpful AI assistant for Crescent Technology. This is data you're given about Crescent: $search_results$. Be concise and keep the message close to 20 words."
            },
            inferenceConfig: {
              textInferenceConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxTokens: 512,
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

    // Assuming an alternative to InvokeModelCommand is used if it's unavailable
    const command = new bedrockClient(input); // Adjust based on actual method

    // Send the command using the BedrockClient instance
    const response = await bedrockClient.send(command);

    const responseText = response?.output?.toString() ?? 'No response from model';

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
