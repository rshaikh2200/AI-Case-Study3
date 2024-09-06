"use client";

import { useState } from 'react';

export default function HomePage() {
    const [department, setDepartment] = useState('');
    const [role, setRole] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [caseStudies, setCaseStudies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const userData = JSON.stringify({
            department,
            role,
            specialty
        });

        try {
            const res = await fetch('/api/claude-bedrock', {
                method: 'POST',
                body: userData,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch case studies');
            }

            const data = await res.json();
            setCaseStudies(data);
        } catch (error) {
            console.error('Error fetching case studies:', error);
            setError('Failed to generate case studies');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Take Assessment</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Department" 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                />
                <input 
                    type="text" 
                    placeholder="Role" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                />
                <input 
                    type="text" 
                    placeholder="Specialty" 
                    value={specialty} 
                    onChange={(e) => setSpecialty(e.target.value)} 
                />
                <button type="submit">Take Assessment</button>
            </form>

            {loading && <p>Loading case studies...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {caseStudies.length > 0 && (
                <div>
                    <h2>Generated Case Studies</h2>
                    <ul>
                        {caseStudies.map((caseStudy, index) => (
                            <li key={index}>
                                <h3>Case Study {index + 1}</h3>
                                <p>{caseStudy.caseStudy}</p>
                                <p><strong>Question:</strong> {caseStudy.question}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
