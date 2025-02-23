import { useState } from 'react';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-models', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to generate video');
      }
      const data = await res.json();
      // Assuming the API returns an object with a property `video_url`
      setVideoUrl(data.video_url || '');
    } catch (error) {
      console.error(error);
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
          <video width="640" height="360" controls>
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}
