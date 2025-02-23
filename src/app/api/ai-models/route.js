// src/app/api/ai-models/route.js
import aivideoapi from '@api/aivideoapi';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Authenticate with the API
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // Define the payload
    const payload = {
      text_prompt: "masterpiece, cinematic, man smoking cigarette looking outside window, moving around",
      model: "gen3",
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: "",
      time: 5
    };

    // Call the API method and await the response
    const { data } = await aivideoapi.generate_by_text_runway_generate_text_post(payload);

    // Return the API response as JSON
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error generating video:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
