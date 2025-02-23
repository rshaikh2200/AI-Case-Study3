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

      // Poll for status
      let videoUrl;
      while (true) {
        const statusRes = await fetch(`/api/ai-models/${generationId}`);
        if (!statusRes.ok) throw new Error('Status check failed');
        const statusData = await statusRes.json();

        if (statusData.status === 'succeeded') {
          videoUrl = statusData.video_url;
          break;
        } else if (statusData.status === 'failed') {
          throw new Error('Video generation failed');
        }

        // Wait 2 seconds between checks
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setVideoUrl(videoUrl);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>AI Video Generator</h1>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Video'}
      </button>
      {videoUrl && (
        <div style={{ marginTop: '2rem' }}>
          <video width="640" height="360" controls autoPlay>
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}