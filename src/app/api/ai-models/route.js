// pages/api/generate-video.js
import { NextApiRequest, NextApiResponse } from 'next'
import aivideoapi from '@api/aivideoapi';

// Authenticate once with your key:
aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4')

export default async function handler(req = NextApiRequest, res = NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    // Example body payload for text-to-video
    // Adjust to match your actual prompt / model settings
    const payload = {
      text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
      model: 'gen3',
      width: 1344,
      height: 768,
      motion: 5,
      seed: 0,
      callback_url: '',
      time: 5
    }

    // Pseudo-code: call the library’s method to generate the video
    // The exact usage depends on how `aivideoapi` is structured
    const response = await aivideoapi.generateVideo(payload)

    // We assume `response` includes some object with a `video_url`
    // Adjust based on the actual shape of the response.
    const { video_url } = response

    if (!video_url) {
      return res.status(500).json({ error: 'No video URL in response.' })
    }

    // Send the video URL to the client
    return res.status(200).json({ videoUrl: video_url })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}
