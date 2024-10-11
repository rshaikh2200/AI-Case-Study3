import { ElevenLabsClient } from "elevenlabs";
import dotenv from 'dotenv';
import { NextResponse } from 'next/server';

dotenv.config({ path: '.env.local' });

const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Debugging: Confirm API key is loaded
console.log("ElevenLabs API Key Loaded:", !!process.env.ELEVENLABS_API_KEY);

export const POST = async (req) => {
  const { text } = await req.json();

  if (!text) {
    return NextResponse.json(
      { error: "Text is required for audio generation" },
      { status: 400 }
    );
  }

  try {
    // Remove the substring "Multiple Choice" from the text
    const sanitizedText = text.replace("Multiple Choice", "");
    
    const audio = await elevenLabsClient.generate({
      voice: 'ErXwobaYiN019PkySvjV',
      model_id: "eleven_turbo_v2_5",
      text: sanitizedText,
    });
  } catch (error) {
    console.error("Error generating audio:", error);
  }

    // Assuming `audio` is a Buffer. If it's a stream, handle accordingly.
    // Remove the arrayBuffer call
    // const audioStream = await audio.arrayBuffer();

    // Send the Buffer directly
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audio.length, // Optional: Specify content length
      },
    });

  } catch (error) {
    console.error("Error generating audio:", error);

    if (error.body) {
      try {
        const errorBody = await error.body.text();
        console.error("Error Body:", errorBody);
      } catch (e) {
        console.error("Failed to read error body:", e);
      }
    }

    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
};
