import { NextResponse } from 'next/server'
import aivideoapi from '@api/aivideoapi'

// pages/api/generateText.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const url = 'https://runwayml.p.rapidapi.com/generate/text';
  const options = {
    method: 'POST',
    headers: {
      'x-rapidapi-key': '5f480fd5e6mshb21466ec4e56a98p175e3cjsn2d7d41efbe18',
      'x-rapidapi-host': 'runwayml.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5
    }),
  };

  try {
    const response = await fetch(url, options);
    const result = await response.text();
    res.status(200).json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
