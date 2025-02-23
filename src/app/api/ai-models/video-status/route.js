import { NextResponse } from 'next/server';
import aivideoapi from '@api/aivideoapi';

export async function GET() {
  try {
    // 1) Authenticate
    aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

    // 2) Fetch status from AI Video API
    const { data } = await aivideoapi.get_task_status_runway_status_get();

    // 3) (Optional) Log the data on the server side
    console.log('Received data:', data);

    // 4) Return JSON response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error calling get_task_status_runway_status_get:', error);
    return NextResponse.json({ error: 'Failed to fetch AI video status.' }, { status: 500 });
  }
}
