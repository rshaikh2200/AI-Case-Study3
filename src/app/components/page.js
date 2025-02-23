"use client"

import { useState } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerateVideo = async () => {
    try {
      console.log('Generate button clicked! Making request to /api/generate...');

      const response = await fetch('/api/ai-models', {
        method: 'POST',
      });

      // Check if the request succeeded
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Parse JSON
      const data = await response.json();
      console.log('Response from /api/generate:', data);

      // Check for the URL
      if (data.url) {
        setVideoUrl(data.url);
      } else {
        console.warn('No "url" property in data:', data);
      }
    } catch (error) {
      console.error('Error fetching /api/generate:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Generate AI Video</h1>
      <button onClick={handleGenerateVideo}>
        Generate Video
      </button>

      {videoUrl && (
        <div style={{ marginTop: '20px' }}>
          <h2>Generated Video:</h2>
          <video src={videoUrl} controls autoPlay width="600" />
        </div>
      )}
    </div>
  );
}

