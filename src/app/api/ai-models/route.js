import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi'

// Authenticate once with your key:
aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4')

export async function POST(req) {
  try {
    // If you need to parse a JSON body from the request:
    // const { text_prompt, model, width, height, ... } = await req.json();
    
    // Example payload
    const payload = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5
    };

    // Call your custom AI Video API
    const response = await aivideoapi.generateVideo(payload);

    // We assume the response includes a field named `video_url`
    const { video_url } = response || {};

    if (!video_url) {
      return NextResponse.json(
        { error: 'No video URL in response.' },
        { status: 500 }
      );
    }

    // Return the video URL to the client
    return NextResponse.json({ videoUrl: video_url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Optionally handle GET if you want to avoid 405 on GET requests
export async function GET() {
  return NextResponse.json(
    { message: 'Method Not Allowed' },
    { status: 405 }
  );
}

