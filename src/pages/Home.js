// /pages/index.js
"use client";

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnswer("Loading...");

    try {
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query })
      });
      const data = await response.json();
      if (data.error) {
        setAnswer("Error: " + data.error);
      } else {
        setAnswer(data.answer);
      }
    } catch (err) {
      setAnswer("Error: " + err.message);
    }
  };

  return (
    <div>
      <h1>Chat with my PDF documents!</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask your question here..."
        />
        <br />
        <button type="submit">Ask</button>
      </form>

      <div style={{ marginTop: '1rem' }}>
        <strong>Answer:</strong>
        <p>{answer}</p>
      </div>
    </div>
  );
}
