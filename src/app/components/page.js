"use client";

import React, { useState } from 'react';

export default function Home() {
  const [role, setRole] = useState(''); // State for role input
  const [department, setDepartment] = useState(''); // State for department input
  const [specialty, setSpecialty] = useState(''); // State for specialty input
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
        body: JSON.stringify({ role, department, specialty }), // Send user inputs
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

      {/* Form for user input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <input
          type="text"
          placeholder="Enter Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <input
          type="text"
          placeholder="Enter Specialty"
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
      </div>

      {/* Button to take the assessment */}
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
