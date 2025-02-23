"use client";

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [taskUuid, setTaskUuid] = useState('');
  const [isPolling, setIsPolling] = useState(false);

  // Automatic status polling when UUID is set
  useEffect(() => {
    let intervalId;
    
    if (taskUuid && !isPolling) {
      setIsPolling(true);
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`/api/ai-models/video-status?uuid=${taskUuid}`);
          if (!response.ok) throw new Error(`Status error: ${response.status}`);
          
          const data = await response.json();
          console.log('Status update:', data);
          setStatusData(data);

          if (data.status === 'completed' && data.url) {
            setVideoUrl(data.url);
            setIsPolling(false);
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Polling error:', error);
          setIsPolling(false);
          clearInterval(intervalId);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskUuid, isPolling]);

  // Start video generation
  const handleGenerateVideo = async () => {
    try {
      console.log('Starting video generation...');
      setVideoUrl('');
      setStatusData(null);
      
      const response = await fetch('/api/ai-models', {
        method: 'POST',
      });

      if (!response.ok) throw new Error(`Generate error: ${response.status}`);
      
      const data = await response.json();
      console.log('Generation response:', data);

      if (data.uuid) {
        setTaskUuid(data.uuid);
        console.log('Generation started with UUID:', data.uuid);
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Generate AI Video</h1>

      <button onClick={handleGenerateVideo} disabled={isPolling}>
        {isPolling ? 'Generating...' : 'Generate Video'}
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

      {taskUuid && !videoUrl && (
        <p style={{ marginTop: '20px', color: '#666' }}>
          Video generation in progress (UUID: {taskUuid})...
        </p>
      )}
    </div>
  );
}