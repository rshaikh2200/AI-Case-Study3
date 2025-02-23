import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('--- /api/generate called ---');

  try {
    // Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // For now, let's hardcode the prompt, model, etc.
    // or read from req.body if needed
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

    console.log('Request body we send to AI API:', requestBody);

    // Make the request to your AI Video API
    const response = await aivideoapi.generate_by_text_runway_generate_text_post(requestBody);
    const { data } = response;
    console.log('Response from aivideoapi:', data);

    // Send that back to the client
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error in /api/generate:', error);
    return res.status(500).json({ error: 'Error generating video' });
  }
}
