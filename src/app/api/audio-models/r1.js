import { ElevenLabsClient } from "elevenlabs";
import { v4 as uuid } from "uuid";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

dotenv.config({ path: '.env.local' });

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export default async function generateAudio(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required for audio generation" });
    }

    const audio = await elevenLabsClient.generate({
      voice: 'ErXwobaYiN019PkySvjV',
      model_id: "eleven_multilingual_v2",
      text,
    });

    const audioStream = await audio.blob();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioStream);
  } catch (error) {
    console.error("Error generating audio:", error);
    return res.status(500).json({ error: "Failed to generate audio" });
  }
}

