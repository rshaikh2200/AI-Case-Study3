'use client';
import { useState } from 'react';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Start generation
      const initRes = await fetch('/api/ai-models', { method: 'POST' });
      if (!initRes.ok) throw new Error('Failed to start generation');
      const { generationId } = await initRes.json();
  
      // Poll for status with error handling
      let newVideoUrl = '';
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 2s = 1 minute timeout
  
      while (attempts < maxAttempts) {
        const statusRes = await fetch(`/api/ai-models/${generationId}`);
        if (!statusRes.ok) throw new Error('Status check failed');
        
        const { status, video_url } = await statusRes.json();
  
        if (status === 'succeeded') {
          newVideoUrl = video_url;
          break;
        }
        if (status === 'failed') {
          throw new Error('Video generation failed');
        }
  
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
  
      if (!newVideoUrl) throw new Error('Generation timed out');
      setVideoUrl(newVideoUrl);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Loading...' : 'Generate Video'}
      </button>
      {videoUrl && (
        <video src={videoUrl} controls />
      )}
    </div>
  );
}
