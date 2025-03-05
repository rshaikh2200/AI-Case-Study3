// pages/index.js
import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  // State for form values
  const [formData, setFormData] = useState({
    topic: 'Random AI Story',
    voice: 'Sarah',
    theme: 'cinematic',
    style: 'Realistic',
    language: 'English',
    duration: '30-60',
    aspect_ratio: '1:1',
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
  const [pollingCount, setPollingCount] = useState(0);
  const MAX_POLLING_ATTEMPTS = 30; // Stop after ~5 minutes (30 attempts × 10 seconds)

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
    
    // Validate required fields for Custom topic
    if (formData.topic === 'Custom' && !formData.prompt) {
      setError('Custom prompt is required when topic is set to Custom');
      return;
    }
    
    // Reset states before starting new video generation
    setVideoUrl('');
    setVideoStatus('');
    setVideoId(null);
    setPollingCount(0);

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
      
      console.log('API Response:', response.status);
      console.log('Request payload:', JSON.stringify(formData, null, 2));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        console.error('Error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Video generation successful, received ID:', data.vid);
      setVideoId(data.vid);
      setVideoStatus('processing');
      
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
      console.log('Checking status for video ID:', vid);
      const response = await fetch(`https://viralapi.vadoo.tv/api/get_video_url?id=${vid}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        console.error('Error response:', errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Video status check response:', data);
      
      if (data.status === 'complete' && data.url) {
        // Video is complete and URL is available
        setVideoStatus('complete');
        setVideoUrl(data.url);
        setIsGenerating(false);
        console.log('Video ready at URL:', data.url);
      } else if (data.status === 'complete' && !data.url) {
        // Odd case: Status is complete but no URL
        console.error('Status is complete but no URL returned');
        setError('Video processing completed but URL is not available. Please try again.');
        setIsGenerating(false);
      } else if (data.status === 'processing' || !data.status) {
        // Still processing or status not provided
        setVideoStatus('processing');
        // Increment the polling count
        const newPollingCount = pollingCount + 1;
        setPollingCount(newPollingCount);
        
        if (newPollingCount >= MAX_POLLING_ATTEMPTS) {
          setError('Video processing timed out after 5 minutes. Please try again later.');
          setIsGenerating(false);
          return;
        }
        
        console.log(`Video still processing (attempt ${newPollingCount}/${MAX_POLLING_ATTEMPTS}), checking again in 10 seconds...`);
        setTimeout(() => checkVideoStatus(vid), 10000);
      } else {
        // Unexpected status
        setError(`Unexpected video status: ${data.status}`);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Error in checkVideoStatus:', err);
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
          <label className="block mb-2 font-semibold">API Key *</label>
          <input
            type="text"
            value={apiKey}
            onChange={handleApiKeyChange}
            className="w-full p-2 border rounded"
            placeholder="Enter your API key"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Required for API authentication</p>
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
            <p className="mb-2">
              Status: <span className={videoStatus === 'complete' ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold'}>
                {videoStatus || 'Processing'}
              </span>
            </p>
            {videoStatus === 'processing' && (
              <div className="flex items-center mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                <p className="text-sm text-gray-600">
                  This may take 2-3 minutes. Please wait... 
                  {pollingCount > 0 && ` (Check ${pollingCount}/${MAX_POLLING_ATTEMPTS})`}
                </p>
              </div>
            )}
          </div>
        )}

        {videoUrl && videoStatus === 'complete' && (
          <div className="mb-4 border p-4 rounded-lg shadow-md">
            <h2 className="font-bold text-xl mb-4 text-center">Your Generated Video</h2>
            <div className="aspect-video bg-black">
              <video 
                src={videoUrl} 
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 text-center">
              <a 
                href={videoUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors inline-block"
              >
                Open Video in New Tab
              </a>
              <p className="text-sm text-gray-600 mt-2">This video will be available for 30 minutes before expiry</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
