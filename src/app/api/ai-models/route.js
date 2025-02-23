// src/app/api/ai-models/route.js
import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function POST(request) {
  try {
    // Authenticate with the API
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Build the request body using the gen3 alpha model from Runway.
    // Extend the video to 50 seconds (5 segments of 10 seconds each).
    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1280,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '', // Update this as needed.
      time: 10,
    };

    // Log the callback_url
    console.log("Callback URL:", requestBody.callback_url);

    // Generate the video using the API
    const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);
    
    console.log(response);

    // Return the generated data as JSON
    return NextResponse.json(response.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error generating video' }, { status: 500 });
  }
}
