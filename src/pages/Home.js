// pages/index.js
import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  // State for form values
  const [formData, setFormData] = useState({
    topic: 'A random AI Story,
    voice: 'Charlie',
    theme: 'Hormozi_1',
    style: 'None',
    language: 'English',
    duration: '30-60',
    aspect_ratio: '1:11',
    prompt: '',
    custom_instruction: '',
    use_ai: '1',
    include_voiceover: '1',
    size: '',
    ypos: '',
    url: '',
    bg_music: '',
    bg_music_volume: '50',
  });

  // State for API key input
  const [apiKey, setApiKey] = useState('');
  
  // States for managing video generation and playback
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoStatus, setVideoStatus] = useState('');
  const [error, setError] = useState('');

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle API key input
  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
  };

  // Generate video
  const generateVideo = async (e) => {
    e.preventDefault();
    
    if (!apiKey) {
      setError('API Key is required');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('https://viralapi.vadoo.tv/api/generate_video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setVideoId(data.vid);
      
      // Start polling for video status
      checkVideoStatus(data.vid);
    } catch (err) {
      setError(`Error generating video: ${err.message}`);
      setIsGenerating(false);
    }
  };

  // Poll for video status
  const checkVideoStatus = async (vid) => {
    try {
      const response = await fetch(`https://viralapi.vadoo.tv/api/get_video_url?id=${vid}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setVideoStatus(data.status);

      if (data.status === 'complete') {
        setVideoUrl(data.url);
        setIsGenerating(false);
      } else if (data.status === 'processing') {
        // Poll again after 10 seconds
        setTimeout(() => checkVideoStatus(vid), 10000);
      } else {
        setError(`Unexpected video status: ${data.status}`);
        setIsGenerating(false);
      }
    } catch (err) {
      setError(`Error checking video status: ${err.message}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Head>
        <title>AI Video Generator</title>
        <meta name="description" content="Generate AI videos with customizable parameters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">AI Video Generator</h1>
        
        <div className="mb-6">
          <label className="block mb-2 font-semibold">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="w-full p-2 border rounded"
            placeholder="Enter your API key"
          />
        </div>

        <form onSubmit={generateVideo} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Topic</label>
              <select 
                name="topic" 
                value={formData.topic} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="Random AI Story">Random AI Story</option>
                <option value="Custom">Custom</option>
                {/* Add more options as needed */}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Voice</label>
              <select 
                name="voice" 
                value={formData.voice} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="Charlie">Charlie</option>
                {/* Add more options as needed */}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Theme</label>
              <select 
                name="theme" 
                value={formData.theme} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="Hormozi_1">Hormozi_1</option>
                {/* Add more options as needed */}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Style</label>
              <select 
                name="style" 
                value={formData.style} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="None">None</option>
                {/* Add more options as needed */}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Language</label>
              <select 
                name="language" 
                value={formData.language} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                {/* Add more language options */}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Duration</label>
              <select 
                name="duration" 
                value={formData.duration} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="30-60">30-60 seconds</option>
                <option value="60-90">60-90 seconds</option>
                <option value="90-120">90-120 seconds</option>
                <option value="5 min">5 minutes</option>
                <option value="10 min">10 minutes</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Aspect Ratio</label>
              <select 
                name="aspect_ratio" 
                value={formData.aspect_ratio} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="9:16">9:16 (Vertical)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Horizontal)</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Use AI</label>
              <select 
                name="use_ai" 
                value={formData.use_ai} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Include Voiceover</label>
              <select 
                name="include_voiceover" 
                value={formData.include_voiceover} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Background Music Volume</label>
              <input 
                type="range" 
                name="bg_music_volume" 
                value={formData.bg_music_volume} 
                onChange={handleChange}
                min="0" 
                max="100" 
                className="w-full"
              />
              <div className="text-sm text-center">{formData.bg_music_volume}%</div>
            </div>
          </div>
          
          {formData.topic === 'Custom' && (
            <div>
              <label className="block mb-1">Custom Prompt</label>
              <textarea 
                name="prompt" 
                value={formData.prompt} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="Enter your custom prompt"
              ></textarea>
            </div>
          )}
          
          <div>
            <label className="block mb-1">Custom Instructions (Optional)</label>
            <textarea 
              name="custom_instruction" 
              value={formData.custom_instruction} 
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="3"
              placeholder="Enter custom instructions to guide AI"
            ></textarea>
          </div>
          
          <div>
            <label className="block mb-1">URL (Optional, for Blog to Video)</label>
            <input 
              type="text" 
              name="url" 
              value={formData.url} 
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Enter URL for blog to video conversion"
            />
          </div>
          
          <div className="text-center">
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating Video...' : 'Generate Video'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {videoId && (
          <div className="bg-gray-100 p-4 rounded mb-4">
            <h2 className="font-bold mb-2">Video ID: {videoId}</h2>
            <p className="mb-2">Status: {videoStatus || 'Processing'}</p>
          </div>
        )}

        {videoUrl && (
          <div className="mb-4">
            <h2 className="font-bold text-xl mb-4">Your Generated Video</h2>
            <div className="aspect-video bg-black">
              <video 
                src={videoUrl} 
                controls
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 text-center">
              <a 
                href={videoUrl} 
                download
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors inline-block"
              >
                Download Video
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
