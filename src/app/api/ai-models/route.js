// ================================================
// /pages/api/chatbot.js  (Next.js 13: /app/api/chatbot/route.js)
// ================================================
import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config();

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export async function POST(request) {
  try {
    // 1) Parse the user query from request body
    const { userQuery } = await request.json(); 
    if (!userQuery) {
      return NextResponse.json(
        { error: 'Please provide a userQuery in the request body.' },
        { status: 400 }
      );
    }

    // 2) Initialize clients
    // Make sure these environment variables are set in .env or .env.local
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
    const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
    const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;  // e.g. "coachcarellm"

    if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX_NAME) {
      throw new Error('Missing one or more required environment variables.');
    }

    // Initialize Pinecone client and index
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // 3) Create an embedding for the user query
    const embedResponse = await openai.embeddings.create({
      input: userQuery,
      model: 'text-embedding-ada-002',
    });
    const userQueryEmbedding = embedResponse.data[0]?.embedding;
    if (!userQueryEmbedding) {
      return NextResponse.json(
        { error: 'Failed to create embedding for user query.' },
        { status: 500 }
      );
    }

    // 4) Query Pinecone for relevant chunks
    const topK = 4;  // how many chunks you want to retrieve
    const pineconeQueryResponse = await index.query({
      vector: userQueryEmbedding,
      topK,
      includeMetadata: true,
    });

    // 5) Combine the top-matching chunks into a single context
    const matchedChunks = (pineconeQueryResponse.matches || [])
      .map((match) => match.metadata?.text ?? "")
      .join("\n\n");

    // 6) Construct the prompt or messages for OpenAI
    // Using ChatCompletion with system + user messages
    const messages = [
      {
        role: "system",
        content: `You are a helpful AI assistant that uses the following 
        extracted context from PDF documents to answer user questions. 
        If the answer is not explicitly stated, say you are unsure; 
        do not fabricate information.`
      },
      {
        role: "system",
        content: `CONTEXT SECTION:\n${matchedChunks}\n\n`
      },
      {
        role: "user",
        content: userQuery
      }
    ];

    // 7) Call OpenAI ChatCompletion
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',     // or gpt-4, etc.
      messages,
      temperature: 0.7
    });

    const assistantMessage = chatResponse.choices?.[0]?.message?.content;

    // 8) Return the result
    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No completion returned from OpenAI.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer: assistantMessage });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
