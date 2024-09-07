"use client";
//hi

import React, { useState } from 'react';
import { TextField, Button, Typography, Container, Box, Paper, CircularProgress, Alert, List, ListItem, ListItemText } from '@mui/material';

export default function Home() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(''); 

  // Form state for department, role, and specialization
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');

  // Handle API call to fetch case studies and questions
  const handleTakeAssessment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/claude-bedrock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department, role, specialization }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch case studies');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Set the fetched case study and questions
      setCaseStudies([{ caseStudy: data.caseStudy, questions: data.questions }]);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Box component={Paper} p={3} my={4}>
        <Typography variant="h4" gutterBottom>Take Assessment</Typography>

        {/* Input fields for department, role, and specialization */}
        <TextField
          label="Department"
          fullWidth
          margin="normal"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        <TextField
          label="Role"
          fullWidth
          margin="normal"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <TextField
          label="Specialization"
          fullWidth
          margin="normal"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
        />

        <Box mt={2}>
          <Button variant="contained" color="primary" onClick={handleTakeAssessment} disabled={isLoading}>
            {isLoading ? <CircularProgress size={24} /> : 'Take Assessment'}
          </Button>
        </Box>

        {/* Error handling */}
        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Display case studies and questions */}
        {caseStudies.length > 0 && (
          <Box mt={4}>
            {caseStudies.map((item, index) => (
              <Box key={index} mb={5} p={3} borderRadius={2} boxShadow={2} bgcolor="background.paper">
                <Typography variant="h5" color="primary" gutterBottom>
                  Case Study {index + 1}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {item.caseStudy}
                </Typography>

                {/* Handle the questions array safely */}
                {Array.isArray(item.questions) ? (
                  item.questions.map((q, i) => (
                    <Box key={i} mt={3} mb={3} p={2} borderRadius={2} boxShadow={1} bgcolor="background.default">
                      <Typography variant="subtitle1" gutterBottom>
                        Question {i + 1}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {q.question}
                      </Typography>

                      {/* Display options with better styling */}
                      <List>
                        {q.options.map((option, optIndex) => (
                          <ListItem key={optIndex} dense>
                            <ListItemText
                              primaryTypographyProps={{ variant: 'body2' }}
                              primary={`${option.key}. ${option.label}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No questions available for this case study.
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
}
