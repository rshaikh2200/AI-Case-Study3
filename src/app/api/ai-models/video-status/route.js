import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function GET(request) {
  try {
    // 1) Extract UUID from query parameters
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');

    if (!uuid) {
      return NextResponse.json(
        { error: 'Missing UUID parameter.' },
        { status: 400 }
      );
    }

    // 2) Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // 3) Fetch status for the specific UUID
    const { data } = await aivideoapi.get_task_status_runway_status_get(uuid);

    // 4) Return the status
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching video status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status.' },
      { status: 500 }
    );
  }
}