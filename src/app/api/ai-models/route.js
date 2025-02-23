// /app/api/ai-models/route.js

import aivideoapi from '@api/aivideoapi';

export async function POST(request) {
  try {
    // Authenticate with the API (consider moving your API key to an environment variable)
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Generate video based on the provided text prompt and settings
    const { data } = await aivideoapi.generate_by_text_runway_generate_text_post({
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5,
    });

    // Return the API data (including uuid) as a JSON response
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500 }
    );
  }
}
