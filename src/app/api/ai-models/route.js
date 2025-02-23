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

     // Generate the video using the API
     const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);
    
    console.log(response)

     // Return the generated data as JSON
     return NextResponse.json(response.data);
   } catch (err) {
     console.error(err);
     return NextResponse.json({ error: 'Error generating video' }, { status: 500 });
   }
 }