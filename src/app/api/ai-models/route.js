import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi';

export default async function handler(req, res) {
  // Only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // The body to send in the generate call
    const requestBody = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5
    };

    // Call the generation method (adjust if your SDK usage differs)
    const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);

    // Destructure the response
    const { data } = response; 
    // data should include the URL of the generated video, e.g. data.url

    return res.status(200).json(data); 
  } catch (error) {
    console.error('Error generating video:', error);
    return res.status(500).json({ error: 'Error generating video' });
  }
}
