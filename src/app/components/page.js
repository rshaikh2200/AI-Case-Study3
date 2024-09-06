"use client";

import React, { useState } from 'react';

export default function Home() {
  const [caseStudies, setCaseStudies] = useState([]); // Store generated case studies and questions
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null); // Add state for handling errors

  const takeAssessment = async () => {
    if (isLoading) return; // Prevent multiple requests
    setIsLoading(true);
    setError(null); // Reset error state before making a new request

    try {
      // Send a request to the backend to generate the assessment
      const response = await fetch('/api/claude-bedrock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: "Generate case studies" }), // Simplified request
      });

      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${errorMessage}`);
      }

      const data = await response.json();

      // Update the case studies state with the generated case studies
      setCaseStudies(data.response.caseStudies || []);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while generating the assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Take the Assessment</h1>
      <button onClick={takeAssessment} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Take Assessment'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display error message */}

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
