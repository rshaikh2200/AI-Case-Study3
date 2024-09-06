"use client";

import React, { useState } from 'react';
import {
    TextField,
    Button,
    Typography,
    Container,
    CircularProgress,
    Alert,
    Paper,
    List,
    ListItem,
    ListItemText,
    Box,
} from '@mui/material';

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

            if (!res.ok) {
                const errorMessage = await res.text();
                throw new Error(`Network response was not ok: ${res.status} ${errorMessage}`);
            }

            const data = await res.json();
            setResponse(data);
        } catch (err) {
            setError(`Error: ${err.message}`);  // More specific error message
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ padding: 4, mt: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Case Study Assessment
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField
                        label="Role"
                        variant="outlined"
                        fullWidth
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Specialization"
                        variant="outlined"
                        fullWidth
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        margin="normal"
                        required
                    />
                    <TextField
                        label="Department"
                        variant="outlined"
                        fullWidth
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        margin="normal"
                        required
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            size="large"
                        >
                            {loading ? <CircularProgress size={24} /> : 'Take Assessment'}
                        </Button>
                    </Box>
                </form>

                {error && (
                    <Alert severity="error" sx={{ mt: 3 }}>
                        {error}
                    </Alert>
                )}

                {response && (
                    <Box sx={{ mt: 5 }}>
                        <Typography variant="h5" gutterBottom>
                            Generated Case Studies
                        </Typography>
                        {response.caseStudies.map((study, index) => (
                            <Paper key={index} sx={{ mb: 3, p: 3 }} variant="outlined">
                                <Typography variant="h6" gutterBottom>
                                    Case Study {index + 1}
                                </Typography>
                                <Typography>{study.summary}</Typography>
                                <List sx={{ mt: 2 }}>
                                    {study.questions.map((question, qIndex) => (
                                        <ListItem key={qIndex}>
                                            <ListItemText primary={question} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        ))}
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
