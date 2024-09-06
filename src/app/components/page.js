"use client";

import React, { useState } from 'react';

export default function Home() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTakeAssessment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/claude-bedrock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // Set content type as JSON
        },
        body: JSON.stringify({
          department: 'ER',  // Replace with actual user input or dynamic data
          role: 'Surgeon',
          specialty: 'Orthopedic',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCaseStudies(data);  // Update state with the retrieved case studies
      } else {
        throw new Error(data.error || 'Failed to fetch case studies');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Take the Assessment</h1>
      <button onClick={handleTakeAssessment} disabled={loading}>
        {loading ? 'Generating...' : 'Take Assessment'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginTop: '20px' }}>
        {caseStudies.length > 0 && (
          <div>
            <h2>Generated Case Studies</h2>
            {caseStudies.map((study, index) => (
              <div key={index} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
                <h3>Case Study {index + 1}</h3>
                <p><strong>Summary:</strong> {study.caseStudy}</p>
                <p><strong>Question:</strong> {study.question}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
