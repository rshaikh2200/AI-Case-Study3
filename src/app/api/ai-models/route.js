import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * POST handler - Handles chat messages with Qwen3_30B_Medical model with streaming
 */
export async function POST(request) {
  try {
    const { messages, conversationHistory } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required.' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client for Qwen3_30B_Medical model
    const medicalClient = new OpenAI({
      baseURL: 'https://fm8vizgo0fsaunlm.us-east-2.aws.endpoints.huggingface.cloud/v1/',
      apiKey: process.env.HF_API_KEY,
    });

    // Build conversation messages
    // Include system message and conversation history
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful medical assistant powered by AI Modeled trained on Error Prevention Techniques and Scenarios. Provide accurate, evidence-based medical information and guidance. Always remind users to consult with qualified healthcare professionals for medical advice, diagnosis, or treatment. Be clear, concise, and professional in your responses.',
    };

    // Combine system message with conversation history and new messages
    const allMessages = [systemMessage];
    
    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      allMessages.push(...conversationHistory);
    }
    
    // Add the new user message
    allMessages.push(...messages);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          // Call the Qwen3_30B_Medical model with streaming enabled
          const stream = await medicalClient.chat.completions.create({
            model: 'rshaikh22/Qwen3_30B_Instruct_CQA_Medical',
            messages: allMessages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true, // Enable streaming
          });

          // Process the stream
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
              // Send the chunk as a server-sent event
              const data = JSON.stringify({ 
                type: 'content',
                content: content 
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          // Send completion signal
          const done = JSON.stringify({ 
            type: 'done' 
          });
          controller.enqueue(encoder.encode(`data: ${done}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Error in streaming:', error);
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'An unexpected error occurred while processing your message.',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for nginx
      },
    });
  } catch (error) {
    console.error('Error in AI chatbot:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred while processing your message.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
