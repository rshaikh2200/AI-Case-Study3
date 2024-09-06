'use client';

import React, { useEffect, useState, useRef } from "react";
import { Box, Stack, TextField, Button, Paper, Typography, Avatar, List, ListItem, ListItemText, Divider, IconButton } from '@mui/material';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import LogoutIcon from '@mui/icons-material/Logout';


export default function HomePage() {
    const [role, setRole] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [department, setDepartment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [response, setResponse] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/claude-bedrock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role, specialty, department }),
            });

            const data = await res.json();
            if (res.ok) {
                setResponse(data);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Case Study Assessment</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                    </label>
                    <input
                        type="text"
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                        Specialty
                    </label>
                    <input
                        type="text"
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department
                    </label>
                    <input
                        type="text"
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        required
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        {loading ? 'Loading...' : 'Take Assessment'}
                    </button>
                </div>
            </form>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            {response && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-2">Generated Case Studies</h2>
                    {response.caseStudies.map((study, index) => (
                        <div key={index} className="mb-4 p-4 border rounded-md">
                            <p className="font-semibold">Case Study {index + 1}</p>
                            <p>{study.summary}</p>
                            <ul className="list-disc ml-5 mt-2">
                                {study.questions.map((question, qIndex) => (
                                    <li key={qIndex}>{question}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

