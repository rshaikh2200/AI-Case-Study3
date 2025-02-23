// src/app/api/ai-models/route.js
import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function POST(request) {
  try {
    // Authenticate with the API
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Build the request body for the Runway model
    // Adjust 'time' to a valid number, e.g., 5
    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5,  // Make sure 'time' is valid for the API
    };

    // Call the API
    const { data } = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);

    // Return the generated data as JSON
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    // Return a 500 if there's any server or request error
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
