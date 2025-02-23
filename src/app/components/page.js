"use client";

import { useState } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [statusData, setStatusData] = useState(null);

  // 1) This calls /api/ai-models (POST) to start the generation
  const handleGenerateVideo = async () => {
    try {
      console.log('Generate button clicked. Making request to /api/ai-models...');
      
      const response = await fetch('/api/ai-models', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Generate error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response from /api/ai-models (generate):', data);

      // If the API returns an immediate URL (unlikely, but possible),
      // set it here so we can preview it.
      if (data.url) {
        setVideoUrl(data.url);
      }
    } catch (error) {
      console.error('Error generating video:', error);
    }
  };

  // 2) This calls /api/ai-models/status (GET) to check the current status
  const handleCheckStatus = async () => {
    try {
      console.log('Check Status button clicked. Making request to /api/ai-models/status...');
      
      const response = await fetch('/api/ai-models/status'); // GET by default
      if (!response.ok) {
        throw new Error(`Status error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response from /api/ai-models/status:', data);
      setStatusData(data);

      // If the returned data has a `url` indicating the video is ready, set it
      if (data.url) {
        setVideoUrl(data.url);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Generate AI Video</h1>

      <button onClick={handleGenerateVideo}>
        Generate Video
      </button>
      
      <button onClick={handleCheckStatus} style={{ marginLeft: '10px' }}>
        Check Status
      </button>

      {videoUrl && (
        <div style={{ marginTop: '20px' }}>
          <h2>Generated Video:</h2>
          <video src={videoUrl} controls autoPlay width="600" />
        </div>
      )}

      {statusData && (
        <div style={{ marginTop: '20px' }}>
          <h2>Current Status:</h2>
          <pre>{JSON.stringify(statusData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
