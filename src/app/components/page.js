// /app/page.js
"use client";

import { useState } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateVideo = async () => {
    setLoading(true);
    try {
      console.log('Generate button clicked!');
      
      // Call the API route that handles video generation
      const res = await fetch('/api/ai-models', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to generate video');
      }

      const data = await res.json();
      console.log('Response from API:', data);

      // Assuming the returned data contains a "url" property for the generated video
      if (data.url) {
        setVideoUrl(data.url);
      } else {
        console.warn('No "url" property in API response:', data);
      }
    } catch (error) {
      console.error('Error fetching video from API:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Generate AI Video</h1>
      <button onClick={handleGenerateVideo} disabled={loading}>
        {loading ? "Generating..." : "Generate Video"}
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
