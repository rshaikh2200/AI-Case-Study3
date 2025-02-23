"use client";

import { useState } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [taskUuid, setTaskUuid] = useState('');

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

      // Save the task UUID for later status checking
      if (data.uuid) {
        setTaskUuid(data.uuid);
      }

      // Optionally, if the API returns an immediate URL (if ready), set it here
      if (data.url) {
        setVideoUrl(data.url);
      }
    } catch (error) {
      console.error('Error generating video:', error);
    }
  };

  // 2) This calls /api/ai-models/video-status (GET) to check the current status
  const handleCheckStatus = async () => {
    try {
      if (!taskUuid) {
        console.error('No task UUID available. Please generate a video first.');
        return;
      }

      console.log('Check Status button clicked. Making request to /api/ai-models/video-status...');
      
      const response = await fetch(`/api/ai-models/video-status`);
      if (!response.ok) {
        throw new Error(`Status error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response from /api/ai-models/video-status:', data);
      setStatusData(data);

      // If the returned data has a URL indicating the video is ready, set it
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
