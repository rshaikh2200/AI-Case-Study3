// src/app/api/ai-models/route.js
import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function POST() {
  try {
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking...',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      time: 5,
    };

    const { data } = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);

    console.log(`Task initiated. UUID: ${callback_url}`);
    
    // Return generation ID to client
    return NextResponse.json({ generationId: data.generation_id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}