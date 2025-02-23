"use client";

import { useState } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerateVideo = async () => {
    try {
      // POST to our /api/generate endpoint
      const response = await fetch('/api/generate', {
        method: 'POST',
      });
      const data = await response.json();

      // Assuming the returned object has a 'url' field for the video link
      if (data.url) {
        setVideoUrl(data.url);
      } else {
        console.log('No URL returned by generate API:', data);
      }
    } catch (error) {
      console.error('Error generating video:', error);
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
          <h2>Generated Video</h2>
          <video
            src={videoUrl}
            controls
            autoPlay
            width="600"
          />
        </div>
      )}
    </div>
  );
}
