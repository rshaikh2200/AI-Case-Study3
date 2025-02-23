// pages/index.js
import { useState } from 'react'

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerateVideo = async () => {
    setIsLoading(true)
    setError('')
    setVideoUrl('')

    try {
      const res = await fetch('/api/ai-models', {
        method: 'POST'
      })
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      if (!data.videoUrl) {
        throw new Error('No videoUrl returned from server.')
      }

      setVideoUrl(data.videoUrl)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Generate Video Example</h1>
      <button onClick={handleGenerateVideo} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Video'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {videoUrl && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Your Generated Video</h2>
          <video
            src={videoUrl}
            controls
            autoPlay
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )}
    </div>
  )
}
