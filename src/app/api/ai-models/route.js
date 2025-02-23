import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi';

export async function POST(request) {
  console.log('--- /api/ai-models called ---');
  
  try {
    // Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Build request body for AI Video API
    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5,
    };

    console.log('Request body sent to AI API:', requestBody);

    // Call your AI Video API
    const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);
    const { data } = response;
    console.log('Response from aivideoapi:', data);

    // Respond with JSON back to client
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in /api/ai-models:', error);
    return NextResponse.json({ error: 'Error generating video' }, { status: 500 });
  }
}
