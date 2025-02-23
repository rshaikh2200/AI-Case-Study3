// src/app/api/ai-models/[generationId]/route.js
import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function GET(_, { params }) {
  const { generationId } = params;

  try {
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');
    
    // Correct method from the RunwayML SDK
    const { data } = await aivideoapi.get_generation_runway_generate_id_get(
      generationId,
      { timeout: 10000 }
    );

    return NextResponse.json({
      status: data.status,
      video_url: data.result?.url || null
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}