import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async () => {
    // Replace <your-username>/<your-model-id> with your model details
    const inferenceUrl = 'https://api-inference.huggingface.co/models/rshaikh22/coachcarellm';
    
    try {
      const response = await fetch(inferenceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use your environment variable to securely access the API key
          'Authorization': `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`,
        },
        body: JSON.stringify({ inputs: prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from API:', errorData);
        setResult(`Error: ${errorData.error || 'Unknown error occurred.'}`);
        return;
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setResult(JSON.stringify(data, null, 2));
      
    } catch (error) {
      console.error('Fetch error:', error);
      setResult(`Fetch error: ${error.message}`);
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
      <button onClick={handleSubmit} style={{ marginTop: '1rem' }}>
        Submit
      </button>
      <div style={{ marginTop: '2rem' }}>
        <h2>Response:</h2>
        <pre style={{ background: '#f4f4f4', padding: '1rem' }}>{result}</pre>
      </div>
    </div>
  );
}
