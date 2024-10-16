"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

export default function Home() {
  // State Variables
  const [caseStudies, setCaseStudies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCaseStudyIndex, setCurrentCaseStudyIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [showCaseStudies, setShowCaseStudies] = useState(false);
  const [showSafetyStatement, setShowSafetyStatement] = useState(true);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  // Audio-related states
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');

  const audioRef = useRef(null);

  // State to track current question within a case study
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Generate Speech Function
  const generateSpeech = async () => {
    if (!currentCaseStudy) return;
    setIsAudioLoading(true);
    setAudioError('');
    try {
      const response = await fetch('/api/audio-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: currentCaseStudy.scenario,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        return url;
      } else {
        const data = await response.json();
        console.error('Error from server:', data.error);
        setAudioError(data.error || 'Failed to generate audio.');
        return null;
      }
    } catch (error) {
      console.error('Error calling API:', error);
      setAudioError('An unexpected error occurred.');
      return null;
    } finally {
      setIsAudioLoading(false);
    }
  };

  // Fetch Audio and Toggle Play/Pause
  const fetchAudio = async () => {
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      // Generate new speech URL for the current case study
      const url = await generateSpeech();
      if (url) {
        playAudio(url);
      }
    }
  };

  // Play or Pause Audio Function
  const playAudio = (url) => {
    if (audioRef.current) {
      if (audioRef.current.src === url && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioRef.current.src = url;
        audioRef.current
          .play()
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
            setAudioError('Failed to play audio.');
          });
      }
    }
  };

  // Stop audio when switching case studies
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    // Reset audio-related states when changing case study
    setAudioUrl(null);
    setIsAudioPlaying(false);
    setAudioError('');
    setCurrentQuestionIndex(0); // Reset question index when changing case study
  }, [currentCaseStudyIndex]);

  // Handle Audio Play/Pause State
  useEffect(() => {
    const handleAudioEnded = () => {
      setIsAudioPlaying(false);
    };

    const handleAudioPause = () => {
      setIsAudioPlaying(false);
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('ended', handleAudioEnded);
      audioElement.addEventListener('pause', handleAudioPause);
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('ended', handleAudioEnded);
        audioElement.removeEventListener('pause', handleAudioPause);
      }
    };
  }, []);

  // Handle taking the assessment
  const handleTakeAssessment = () => {
    if (!role || !department || !specialization) {
      setError('Please select your Role, Department, and Specialization before proceeding.');
      return;
    } else {
      handleSubmitAssessment();
    } // Added closing brace for else block
  };

  // Handle submitting the assessment
  const handleSubmitAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, role, specialization }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to fetch case studies: ${errorData.message || 'Unknown error'}`
        );
      }

      const data = await response.json();
      setCaseStudies(data.caseStudies);
      setShowSafetyStatement(false);
      setShowCaseStudies(true);
      setCurrentCaseStudyIndex(0);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer changes
  const handleAnswerChange = (caseIndex, questionIndex, selectedOption) => {
    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [caseIndex]: {
        ...prevAnswers[caseIndex],
        [questionIndex]: selectedOption,
      },
    }));
  };

  // Handle previous case study
  const handlePreviousCaseStudy = () => {
    if (currentCaseStudyIndex > 0) {
      setCurrentCaseStudyIndex(currentCaseStudyIndex - 1);
    }
  };

  // Handle next case study
  const handleNextCaseStudy = () => {
    if (currentCaseStudyIndex < caseStudies.length - 1) {
      setCurrentCaseStudyIndex(currentCaseStudyIndex + 1);
    }
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (
      currentCaseStudy &&
      currentCaseStudy.questions &&
      currentQuestionIndex < currentCaseStudy.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Handle submitting the assessment
  const handleSubmitFinalAssessment = () => {
    setAssessmentComplete(true);
    setShowCaseStudies(false);
    setTimeout(() => {
      setAssessmentComplete(false);
      setShowSafetyStatement(true);
      setDepartment('');
      setRole('');
      setSpecialization('');
      setSelectedAnswers({});
      setCaseStudies([]);
      setCurrentCaseStudyIndex(0);
      setCurrentQuestionIndex(0);
    }, 3000);
  };

  // Current Case Study
  const currentCaseStudy = caseStudies[currentCaseStudyIndex];

  // Example options for dropdowns
  const departments = [
    'Operating Room'
    // Add other departments if needed
  ];

  const roles = [
    'Surgeon',
    'Nurse',
    'Circulator Nurse',
    'Surgical Technologist',
    
  ];

  const specializations = [
    'Orthopedic',
    'Neurosurgery',
    'Vascular Surgery',
    'Transplant Surgery',
    'Oncological Surgery',
    'Gynecological Surgery',
    'ENT Surgery',
    'Scrub Nurse',
    'Circulating Nurse',
    'RN First Assistant',
    'Preoperative Nurse',
    'Post-Anesthesia Care Unit Nurse',
    'Perioperative Nurse Educator',
    'Urology Surgery',
  ];

  return (
    <Container maxWidth="md">
      <Box
        component={Paper}
        p={5}
        my={6}
        sx={{ backgroundColor: '#f9f9f9', borderRadius: 2, boxShadow: 3 }}
      >
        {/* Safety Statement */}
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
            Avoidable medical errors in hospitals are the third leading cause of
            death in the USA. 99% of avoidable medical errors can be traced back to the
            misuse or lack of use of the 4 safety principles and corresponding 11
            error prevention tools (EPTs). By understanding and using this safety
            language, harm to patients can be drastically reduced.
          </Typography>
        )}

        {/* Department, Role, Specialization Fields */}
        {showSafetyStatement && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  label="Department"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    if (error) setError(''); // Clear error if any
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (error) setError(''); // Clear error if any
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {roles.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="specialization-label">Specialization</InputLabel>
                <Select
                  labelId="specialization-label"
                  label="Specialization"
                  value={specialization}
                  onChange={(e) => {
                    setSpecialization(e.target.value);
                    if (error) setError(''); // Clear error if any
                  }}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {specializations.map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        {/* Take Assessment Button */}
        <Box my={4} display="flex" justifyContent="center">
          {showSafetyStatement && !showCaseStudies && (
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={handleTakeAssessment}
              disabled={isLoading}
              size="large"
              sx={{
                minWidth: 200,
              }}
            >
              {isLoading
                ? 'Starting your assessment, please wait...'
                : 'Take Assessment'}
            </Button>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Box mt={4} display="flex" justifyContent="center">
            <Typography variant="h6" color="primary" align="center">
              Starting your assessment, please wait...
            </Typography>
          </Box>
        )}

        {/* Case Studies Page */}
        {showCaseStudies && caseStudies.length > 0 && (
          <Box mt={4}>
            {caseStudies.map((currentCaseStudy, caseIndex) => (
              currentCaseStudyIndex === caseIndex && (
                <Box key={caseIndex}>
                  {/* Case Study Image */}
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

                  {/* Case Study Title and Audio Button */}
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography
                      variant="h5"
                      color="primary"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      {`Case Study ${currentCaseStudyIndex + 1}`}
                    </Typography>
                    <Button
                      type="button"
                      variant="contained"
                      color="primary"
                      onClick={fetchAudio}
                      size="small"
                      sx={{
                        marginLeft: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <Typography variant="caption" sx={{ marginLeft: 0.5 }}>
                          Loading...
                        </Typography>
                      ) : isAudioPlaying ? (
                        <>
                          <VolumeUpIcon fontSize="small" />
                          <Typography variant="caption" sx={{ marginLeft: 0.5 }}>
                            Pause
                          </Typography>
                        </>
                      ) : (
                        <>
                          <VolumeOffIcon fontSize="small" />
                          <Typography variant="caption" sx={{ marginLeft: 0.5 }}>
                            Listen
                          </Typography>
                        </>
                      )}
                    </Button>
                  </Box>

                  {/* Audio Element */}
                  <audio ref={audioRef} />

                  {/* Audio Error Alert */}
                  {audioError && (
                    <Box mt={1}>
                      <Alert severity="error">{audioError}</Alert>
                    </Box>
                  )}

                  {/* Case Study Scenario */}
                  <Typography
                    variant="body1"
                    gutterBottom
                    sx={{ marginBottom: 3, fontSize: '1rem' }}
                  >
                    {currentCaseStudy.scenario}
                  </Typography>

                  {/* Case Study Questions */}
                  {currentCaseStudy.questions && currentCaseStudy.questions.length > 0 ? (
                    <Box
                      my={4}
                      p={3}
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: 2,
                      }}
                    >
                      {/* Header for the Question */}
                      <Typography
                        variant="body1"
                        gutterBottom
                        sx={{ marginBottom: 2, fontSize: '1rem' }}
                      >
                        {`Question ${currentQuestionIndex + 1}: ${currentCaseStudy.questions[currentQuestionIndex].question}`}
                      </Typography>

                      <RadioGroup
                        value={
                          selectedAnswers[currentCaseStudyIndex]?.[currentQuestionIndex] || ''
                        }
                        onChange={(e) =>
                          handleAnswerChange(
                            currentCaseStudyIndex,
                            currentQuestionIndex,
                            e.target.value
                          )
                        }
                      >
                        {currentCaseStudy.questions[currentQuestionIndex].options.map((option) => (
                          <FormControlLabel
                            key={option.key}
                            value={option.key}
                            control={<Radio />}
                            label={
                              <Typography variant="body2">
                                <strong>{option.key}.</strong> {option.label}
                              </Typography>
                            }
                            sx={{ marginBottom: 1 }}
                          />
                        ))}
                      </RadioGroup>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No questions available for this case study.
                    </Typography>
                  )}

                  {/* Navigation Buttons */}
                  {currentCaseStudy.questions && currentCaseStudy.questions.length > 0 && (
                    <Box
                      mt={4}
                      display="flex"
                      flexDirection={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems="center"
                      gap={2}
                    >
                      <Box display="flex" gap={2}>
                        {/* Previous Question Button */}
                        <Button
                          type="button"
                          variant="contained"
                          color="secondary"
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestionIndex === 0}
                          size="medium"
                        >
                          Previous Question
                        </Button>
                        {/* Next Question Button */}
                        {currentCaseStudy.questions.length > 1 && (
                          <Button
                            type="button"
                            variant="contained"
                            color="secondary"
                            onClick={handleNextQuestion}
                            disabled={
                              currentQuestionIndex === currentCaseStudy.questions.length - 1
                            }
                            size="medium"
                          >
                            Next Question
                          </Button>
                        )}
                      </Box>

                      <Box display="flex" gap={2}>
                        {/* Previous Case Study Button */}
                        <Button
                          type="button"
                          variant="contained"
                          color="secondary"
                          onClick={handlePreviousCaseStudy}
                          disabled={currentCaseStudyIndex === 0}
                          size="medium"
                        >
                          Previous Case Study
                        </Button>
                        {/* Next/Submit Case Study Button */}
                        {currentCaseStudyIndex === caseStudies.length - 1 ? (
                          <Button
                            type="button"
                            variant="contained"
                            color="primary"
                            onClick={handleSubmitFinalAssessment}
                            size="medium"
                          >
                            Submit
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="contained"
                            color="primary"
                            onClick={handleNextCaseStudy}
                            size="medium"
                          >
                            Next Case Study
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )
            ))}

            {/* Assessment Completion Message */}
            {assessmentComplete && (
              <Box mt={4}>
                <Typography
                  variant="h4"
                  color="success.main"
                  gutterBottom
                  sx={{ textAlign: 'center' }}
                >
                  You have successfully completed the safety assessment!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
}
