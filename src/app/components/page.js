"use client"; // Ensures client-side rendering

import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Container,
  Box,
  Paper,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import dynamic from 'next/dynamic';

// Dynamically load Clerk components (ssr: false)
const SignedIn = dynamic(() => import('@clerk/nextjs').then(mod => mod.SignedIn), { ssr: false });
const SignedOut = dynamic(() => import('@clerk/nextjs').then(mod => mod.SignedOut), { ssr: false });
const SignInButton = dynamic(() => import('@clerk/nextjs').then(mod => mod.SignInButton), { ssr: false });
const SignUpButton = dynamic(() => import('@clerk/nextjs').then(mod => mod.SignUpButton), { ssr: false });
const UserButton = dynamic(() => import('@clerk/nextjs').then(mod => mod.UserButton), { ssr: false });

export default function Home() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenProfileDialog = () => {
    setOpenProfileDialog(true);
  };

  const handleCloseProfileDialog = () => {
    setOpenProfileDialog(false);
  };

  const handleSaveProfile = () => {
    setOpenProfileDialog(false);
  };

  const handleTakeAssessment = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentQuestionIndex(0);

    if (!department || !role || !specialization) {
      setError('Please complete your profile before taking the assessment.');
      setIsLoading(false);
      return;
    }

    try {
      // Fetch case study
      const caseStudyResponse = await fetch('/api/ai-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department, role, specialization }),
      });

      if (!caseStudyResponse.ok) {
        const errorResponse = await caseStudyResponse.json();
        throw new Error(`Failed to fetch case studies: ${errorResponse.message || 'Unknown error'}`);
      }

      const caseStudyData = await caseStudyResponse.json();
      if (!caseStudyData.caseStudy || !Array.isArray(caseStudyData.questions)) {
        throw new Error('Invalid data format received from API');
      }

      setCaseStudies([{ caseStudy: caseStudyData.caseStudy, questions: caseStudyData.questions }]);

      // Fetch image
      const openAiResponse = await fetch('/api/ai-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: caseStudyData.caseStudy }),
      });

      const imageData = await openAiResponse.json();

      if (!openAiResponse.ok || imageData.error) {
        throw new Error(imageData.error || 'Failed to generate image');
      }

      setImageUrl(imageData.imageUrl);
    } catch (err) {
      console.error('Error fetching case study:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            AI Safety Case Studies
          </Typography>
          <SignedOut>
            <SignInButton mode="modal">
              <Button color="inherit">Log In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button color="inherit">Sign Up</Button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
            <IconButton color="inherit" onClick={handleMenuOpen}>
              <Typography>Profile</Typography>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={handleOpenProfileDialog}>Edit Profile</MenuItem>
            </Menu>
          </SignedIn>
        </Toolbar>
      </AppBar>

      <Dialog open={openProfileDialog} onClose={handleCloseProfileDialog}>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <TextField
            label="Department"
            fullWidth
            margin="normal"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            variant="outlined"
            sx={{ marginBottom: 3 }}
          />
          <TextField
            label="Role"
            fullWidth
            margin="normal"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            variant="outlined"
            sx={{ marginBottom: 3 }}
          />
          <TextField
            label="Specialization"
            fullWidth
            margin="normal"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            variant="outlined"
            sx={{ marginBottom: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProfileDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveProfile} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Box component={Paper} p={5} my={6} sx={{ backgroundColor: '#f9f9f9', borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
          Safety Assessment
        </Typography>

        <Box my={4} display="flex" justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            onClick={handleTakeAssessment}
            disabled={isLoading}
            sx={{ padding: '10px 30px', fontSize: '1.2rem' }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Take Assessment'}
          </Button>
        </Box>

        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {imageUrl && (
          <Box mt={4} display="flex" justifyContent="center">
            <img src={imageUrl} alt="Generated by AI" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
          </Box>
        )}

        {caseStudies.length > 0 && (
          <Box mt={4}>
            <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
              Case Study
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ marginBottom: 3 }}>
              {caseStudies[0].caseStudy}
            </Typography>

            {caseStudies[0].questions && caseStudies[0].questions.length > 0 && (
              <Box mt={3} p={3} sx={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Question {currentQuestionIndex + 1} of {caseStudies[0].questions.length}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ marginBottom: 2 }}>
                  {caseStudies[0].questions[currentQuestionIndex].question}
                </Typography>

                <RadioGroup
                  value={selectedAnswers[currentQuestionIndex] || ''}
                  onChange={(e) =>
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [currentQuestionIndex]: e.target.value,
                    })
                  }
                >
                  {caseStudies[0].questions[currentQuestionIndex].options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option.key}
                      control={<Radio />}
                      label={<Typography variant="body2">{option.label}</Typography>}
                      sx={{ marginBottom: 1 }}
                    />
                  ))}
                </RadioGroup>

                <Box mt={4} display="flex" justifyContent="space-between">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIndex === 0}
                    sx={{ padding: '8px 16px' }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(prev + 1, caseStudies[0].questions.length - 1))}
                    disabled={currentQuestionIndex === caseStudies[0].questions.length - 1}
                    sx={{ padding: '8px 16px' }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
}
