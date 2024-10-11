"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

const safetyQuestions = [
  {
    question: 'The four safety principles are S.A.F.E. The S stands for Support the team, The A stands for Ask Questions, the F stands for Focus on the Task and the E stands for?',
    options: ['Effective communication', 'Eat out', 'Everything goes', 'Effective engineering'],
  },
  {
    question: 'The two error prevention tools associated with the first safety principle “S” - “Support the team” are peer check, peer coach, and _____?',
    options: ['Debrief', 'ARCC', 'SBAR', 'STAR'],
  },
  {
    question: 'The two error prevention tools associated with the second safety principle “A” - “Ask Questions” are ARCC and _____?',
    options: ['Validate and Verify', 'SBAR', 'ARCC', 'STAR'],
  },
  {
    question: 'The two error prevention tools associated with the third safety principle “F” - “Focus on the task” are STAR and _____?',
    options: ['No Distraction Zone', 'SBAR', 'ARCC', 'Debrief'],
  },
  {
    question: 'A peer check is when you 1) ask your colleagues to review your work and offer assistance in reviewing the work of others. True or False?',
    options: ['True', 'False'],
  },
  {
    question: 'In peer coaching, you can coach to reinforce (celebrate it publicly when someone does something correctly) or coach to correct (correct someone privately if possible when something is done incorrectly). True or False?',
    options: ['True', 'False'],
  },
  {
    question: 'Which of the following is a good practice for a debrief?',
    options: ['All three below are good practice for debrief', 'Last only 3 minutes', 'Senior member speaks last so that all team members will freely speak up.', 'Should be structured by asking: What went well, What did not go well, and Who will follow through?'],
  },
  {
    question: 'Which of the following is NOT an escalation step in ARCC?',
    options: ['All four steps below are valid', 'Ask a question to gently prompt the other person of a potential safety issue', 'Request a change to make the person fully aware of the risk', 'Voice a concern if the person is resistant', 'Use the chain of command if the possibility of patient harm persists'],
  },
  {
    question: 'Which of the following is NOT an important step in STAR?',
    options: ['All four steps below are correct', 'Stop – pause for two seconds to focus your attention on the task at hand', 'Think – consider the actions you\'re about to take', 'Act – concentrate and carry out the task', 'Review – check to make sure that the task was done right and you got the right result'],
  },
  {
    question: 'Which of the following is NOT an important principle that makes an effective handoff?',
    options: ['All six principles below are effective', 'Standardized and streamlined: concise communication ensures only the critical and necessary information is included.', 'Distraction free environment: conduct handoffs in a “no distraction zone”', 'Face to face/bedside (interactive): ensure the receiver can validate, verify, or ask clarifying questions.', 'Acknowledgements/repeat backs: communication without acknowledgement ISN’T communication', 'Verbal written/printed information: best retention if possible', 'Opportunity for questions/clarification: ask “What questions do you have?”'],
  },
  {
    question: 'Which of the following is NOT a step in Read and Repeat Back communication?',
    options: ['All 3 below are steps in Read and Repeat Back communication', 'Sender communicates information to receiver', 'Receiver listens or writes down the information and reads/repeats it back', 'Sender acknowledges the accuracy of the read-back by stating “That’s correct”'],
  },
  {
    question: 'Which of the following is NOT a part of the SBAR technique?',
    options: ['All four parts below are part of the SBAR technique', 'Situation: what is the situation, patient, or project?', 'Background: what is important to communicate including problems and precautions?', 'Assessment: what is my assessment of the situation, problems, and precautions?', 'Recommendations: what is my recommendation, request, or plan?'],
  },
  {
    question: 'Which of the following is NOT a situation in which asking a clarifying question would be important?',
    options: ['All three below are important situations where asking a clarifying question would be important', 'When in unexpected high-risk situations', 'When information is incomplete', 'When information is ambiguous'],
  },
];

export default function Home() {
  const [caseStudies, setCaseStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCaseStudyIndex, setCurrentCaseStudyIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [showPreAssessment, setShowPreAssessment] = useState(false);
  const [showCaseStudies, setShowCaseStudies] = useState(false);
  const [showSafetyStatement, setShowSafetyStatement] = useState(true);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const audioRef = useRef(null);

  const fetchAudio = async () => {
    try {
      const response = await fetch("/api/audio-models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: currentCaseStudy.scenario }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Stop any existing audio before playing new one
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create a new Audio object and play
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setIsAudioPlaying(true);

      // When audio ends, update the state
      audio.onended = () => {
        setIsAudioPlaying(false);
      };
    } catch (error) {
      console.error("Error fetching audio:", error);
    }
  };

  const handleTakeAssessment = async () => {
    setShowPreAssessment(true);
    setShowSafetyStatement(false);
    await generateImageAndQuestionsForCaseStudy(0);
  };

  const handleSubmitPreAssessment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department, role, specialization }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch case studies: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      setCaseStudies(data.caseStudies);
      setShowPreAssessment(false);
      setShowCaseStudies(true);
      await generateImageAndQuestionsForCaseStudy(0); // Fetch first case study immediately after data load
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCaseStudy = caseStudies[currentCaseStudyIndex];

  const handleAnswerChange = (caseStudyIndex, questionIndex, selectedOption) => {
    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [caseStudyIndex]: {
        ...prevAnswers[caseStudyIndex],
        [questionIndex]: selectedOption,
      },
    }));
  };

  const generateImageAndQuestionsForCaseStudy = async (index) => {
    if (caseStudies[index] && !caseStudies[index].imageUrl) {
      await fetchImagesAndQuestionsForCaseStudies(index);
    }
  };

  const handleNextButtonClick = async () => {
    const nextIndex = currentCaseStudyIndex + 1;
    if (nextIndex < caseStudies.length) {
      setCurrentCaseStudyIndex(nextIndex);
      await generateImageAndQuestionsForCaseStudy(nextIndex);
    }
  };

  const handlePreviousButtonClick = () => {
    const prevIndex = currentCaseStudyIndex - 1;
    if (prevIndex >= 0) {
      setCurrentCaseStudyIndex(prevIndex);
    }
  };

  const handleSubmitAssessment = () => {
    setAssessmentComplete(true);
    setShowCaseStudies(false);
    setTimeout(() => {
      setAssessmentComplete(false);
      setShowSafetyStatement(true);
    }, 3000);
  };

  // Stop audio when switching case studies
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsAudioPlaying(false);
    }
    // Cleanup when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentCaseStudyIndex]);

  return (
    <Container maxWidth="md">
      <Box
        component={Paper}
        p={5}
        my={6}
        sx={{ backgroundColor: '#f9f9f9', borderRadius: 2, boxShadow: 3 }}
      >
        {showSafetyStatement && (
          <Typography
            variant="body1"
            gutterBottom
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              marginBottom: 4,
            }}
          >
            Avoidable medical errors in hospitals are the third leading cause of death in the USA.
            99% of avoidable medical errors can be traced back to the misuse or lack of use of the
            4 safety principles and corresponding 11 error prevention tools (EPTs). By understanding
            and using this safety language, harm to patients can be drastically reduced.
          </Typography>
        )}

        {showSafetyStatement && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Department"
                fullWidth
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Role"
                fullWidth
                value={role}
                onChange={(e) => setRole(e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Specialization"
                fullWidth
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                variant="outlined"
              />
            </Grid>
          </Grid>
        )}

        <Box my={4} display="flex" justifyContent="center">
          {!showPreAssessment && !showCaseStudies && (
            <Button
              type="button" // Explicitly set to "button"
              variant="contained"
              color="primary"
              onClick={handleTakeAssessment}
              disabled={isLoading}
              size="large" // Adjust as needed
              sx={{
                padding: '10px 30px',
                fontSize: '1rem',
              }}
            >
              {isLoading
                ? 'Starting your assessment in a few minutes, please wait.'
                : 'Take Assessment'}
            </Button>
          )}
        </Box>

        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {showPreAssessment && !isLoading && (
          <Box
            mt={4}
            p={3}
            sx={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: 2,
              padding: 4,
            }}
          >
            <Typography
              variant="h5"
              color="primary"
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              Safety Principles Questions
            </Typography>
            {safetyQuestions.map((questionData, index) => (
              <Box
                key={index}
                mt={2}
                p={2}
                sx={{ backgroundColor: '#f0f0f0', borderRadius: 2 }}
              >
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  {`Question ${index + 1}`}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {questionData.question}
                </Typography>
                <RadioGroup>
                  {questionData.options.map((option, optionIndex) => (
                    <FormControlLabel
                      key={optionIndex}
                      value={option}
                      control={<Radio />}
                      label={
                        <Typography variant="body2">{option}</Typography>
                      }
                      sx={{ marginBottom: 1 }}
                    />
                  ))}
                </RadioGroup>
              </Box>
            ))}

            <Box mt={4} display="flex" justifyContent="center">
              <Button
                type="button" // Explicitly set to "button"
                variant="contained"
                color="primary"
                onClick={handleSubmitPreAssessment}
                disabled={isLoading}
                size="large" // Adjust as needed
                sx={{ padding: '10px 30px', fontSize: '1rem' }}
              >
                {isLoading
                  ? 'Starting your assessment in a few minutes, please wait.'
                  : 'Submit: Part I'}
              </Button>
            </Box>
          </Box>
        )}

        {isLoading && (
          <Box mt={4} display="flex" justifyContent="center">
            <Typography
              variant="h6"
              color="primary"
              align="center"
            >
              Starting your assessment in a few minutes, please wait.
            </Typography>
          </Box>
        )}

        {showCaseStudies && caseStudies.length > 0 && currentCaseStudy && (
          <Box mt={4}>
            {currentCaseStudy.imageUrl && (
              <Box mb={3} display="flex" justifyContent="center">
                <Box
                  component="img"
                  src={currentCaseStudy.imageUrl}
                  alt={`Case Study ${currentCaseStudyIndex + 1} Image`}
                  sx={{
                    width: '100%',
                    maxWidth: '520px',
                    height: 'auto',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    '@media (max-width: 600px)': {
                      maxWidth: '100%',
                    },
                  }}
                />
              </Box>
            )}

            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="h5"
                color="primary"
                gutterBottom
                sx={{ fontWeight: 'bold' }}
              >
                {`Case Study ${currentCaseStudyIndex + 1}`}
              </Typography>
              <Button
                type="button" // Explicitly set to "button"
                variant="contained"
                color="primary"
                onClick={fetchAudio}
                size="small" // Set to small for a smaller button
                sx={{
                  marginLeft: 2,
                  padding: '4px 8px', // Further reduced padding
                  fontSize: '0.75rem', // Smaller font size
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 'auto', // Remove minimum width
                }}
                disabled={isAudioPlaying}
              >
                {isAudioPlaying ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                <Typography
                  variant="caption" // Smaller text variant
                  sx={{ marginLeft: 0.5 }}
                >
                  Listen
                </Typography>
              </Button>
            </Box>

            {/* Removed the audio control element */}

            <Typography
              variant="body1"
              gutterBottom
              sx={{ marginBottom: 3, fontSize: '1rem' }}
            >
              {currentCaseStudy.scenario.replace('Multiple Choice', '')}
            </Typography>

            {currentCaseStudy.questions.map((questionData, qIndex) => (
              <Box
                key={qIndex}
                my={4}
                p={3}
                sx={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: 2,
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {`Question ${qIndex + 1}: ${questionData.question}`}
                </Typography>

                <RadioGroup
                  value={
                    selectedAnswers[currentCaseStudyIndex]?.[qIndex] || ''
                  }
                  onChange={(e) =>
                    handleAnswerChange(
                      currentCaseStudyIndex,
                      qIndex,
                      e.target.value
                    )
                  }
                >
                  {questionData.options.map((option, i) => (
                    <FormControlLabel
                      key={i}
                      value={option.key}
                      control={<Radio />}
                      label={
                        <Typography variant="body2">
                          {option.label}
                        </Typography>
                      }
                      sx={{ marginBottom: 1 }}
                    />
                  ))}
                </RadioGroup>
              </Box>
            ))}

            <Box mt={4} display="flex" justifyContent="space-between">
              <Button
                type="button" // Explicitly set to "button"
                variant="contained"
                color="secondary"
                onClick={handlePreviousButtonClick}
                disabled={currentCaseStudyIndex === 0}
                size="small" // Set to small
                sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
              >
                Previous
              </Button>
              {currentCaseStudyIndex === caseStudies.length - 1 ? (
                <Button
                  type="button" // Explicitly set to "button"
                  variant="contained"
                  color="primary"
                  onClick={handleSubmitAssessment}
                  size="small" // Set to small
                  sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
                >
                  Submit
                </Button>
              ) : (
                <Button
                  type="button" // Explicitly set to "button"
                  variant="contained"
                  color="primary"
                  onClick={handleNextButtonClick}
                  size="small" // Set to small
                  sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        )}

        {assessmentComplete && (
          <Box mt={4}>
            <Typography
              variant="h4"
              color="success"
              gutterBottom
              sx={{ textAlign: 'center' }}
            >
              You have successfully completed the safety assessment!
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
