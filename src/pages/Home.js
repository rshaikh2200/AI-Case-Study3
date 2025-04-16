import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Replace <your-username>/<your-model-id> with your model details
    const inferenceUrl = 'https://yji0gm5ep0e3duvt.us-east-1.aws.endpoints.huggingface.cloud';
    
    setLoading(true);
    setResult('');
    
    try {
      const response = await fetch(inferenceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use your environment variable to securely access the API key
          'Authorization': `Bearer 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`,
        },
        body: JSON.stringify({ inputs: prompt }),
      });
      
      // First check if response exists
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      // Get response text first (works whether JSON or not)
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse as JSON if possible
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(`API Error (${response.status}): ${errorData.error || JSON.stringify(errorData)}`);
        } catch (parseError) {
          // If not JSON, use text directly
          throw new Error(`API Error (${response.status}): ${responseText || 'Unknown error'}`);
        }
      }
      
      // Try to parse successful response as JSON
      try {
        const data = JSON.parse(responseText);
        console.log('API Response:', data);
        setResult(JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('Response is not JSON:', responseText);
        setResult(responseText);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      
      // Enhanced error reporting
      let errorMessage = `Error: ${error.message}`;
      
      // Add network diagnostic information
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage += '\n\nPossible causes:'+
          '\n- Network connection issues'+
          '\n- CORS policy restrictions'+
          '\n- Invalid API endpoint URL'+
          '\n- Server is down or unreachable'+
          '\n\nTry checking your network connection and verifying the API endpoint.';
      } else if (error.message.includes('API Error')) {
        errorMessage += '\n\nCheck your API key and request format.';
      }
      
      setResult(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Hugging Face API Inference</h1>
      <textarea
        placeholder="Enter your prompt here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        cols={50}
      />
      <br />
      <button 
        onClick={handleSubmit} 
        style={{ marginTop: '1rem' }}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Submit'}
      </button>
      <div style={{ marginTop: '2rem' }}>
        <h2>Response:</h2>
        <pre style={{ 
          background: '#f4f4f4', 
          padding: '1rem',
          whiteSpace: 'pre-wrap', 
          overflowWrap: 'break-word'
        }}>
          {result || 'No response yet'}
        </pre>
      </div>
    </div>
  );
}
