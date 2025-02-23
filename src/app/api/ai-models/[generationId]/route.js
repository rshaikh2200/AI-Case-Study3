// src/app/api/ai-models/[generationId]/route.js
import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function GET(_, { params }) {
  const { generationId } = params;

  try {
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');
    const { data } = await aivideoapi.get_generation_status(generationId);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}