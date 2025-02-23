"use client";

import { useState } from 'react';
import aivideoapi from '@api/aivideoapi';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');

  const handleGenerateVideo = async () => {
    try {
      console.log('Generate button clicked! Authenticating with aivideoapi...');
      
      // Authenticate with the API
      aivideoapi.auth('1e4f425715d78408a9ac5aeaed15636a4');

      // Await the response from get_task_status_runway_status_get
      const { data } = await aivideoapi.get_task_status_runway_status_get();
      console.log('Response from aivideoapi:', data);

      // Assuming the response data contains a URL property for the generated video
      if (data.url) {
        setVideoUrl(data.url);
      } else {
        console.warn('No "url" property in data:', data);
      }
    } catch (error) {
      console.error('Error fetching video from aivideoapi:', error);
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
