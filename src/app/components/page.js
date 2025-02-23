// pages/index.js
import React, { useState } from 'react';

export default function Home() {
  const [result, setResult] = useState(null);

  const handleGenerateVideo = async () => {
    try {
      const url =
        'https://runwayml.p.rapidapi.com/status?uuid=2858de6f-364c-481e-988a-b930af469aa9';
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': '5f480fd5e6mshb21466ec4e56a98p175e3cjsn2d7d41efbe18',
          'x-rapidapi-host': 'runwayml.p.rapidapi.com',
        },
      };

      // Trigger the fetch call on button click
      const response = await fetch(url, options);
      const data = await response.text();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult('Error fetching data. Check console for details.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Generate Video</h1>
      <button onClick={handleGenerateVideo}>Generate Video</button>
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Response:</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
