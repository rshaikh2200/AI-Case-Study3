// /app/api/ai-models/video-status/route.js

import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function GET(request) {
  try {
    // Extract uuid from the query string
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    if (!uuid) {
      return NextResponse.json(
        { error: 'Missing uuid parameter' },
        { status: 400 }
      );
    }

    // 1) Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // 2) Fetch status using the provided uuid
    const { data } = await aivideoapi.get_task_status_runway_status_get({ uuid });

    // 3) (Optional) Log the data on the server side
    console.log('Received data:', data);

    // 4) Return JSON response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling get_task_status_runway_status_get:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI video status.' },
      { status: 500 }
    );
  }
}
