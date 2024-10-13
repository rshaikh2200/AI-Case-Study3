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
    question:
      'The four safety principles are S.A.F.E. The S stands for Support the team, The A stands for Ask Questions, the F stands for Focus on the Task and the E stands for?',
    options: [
      { key: 'A', label: 'Effective communication' },
      { key: 'B', label: 'Eat out' },
      { key: 'C', label: 'Everything goes' },
      { key: 'D', label: 'Effective engineering' },
    ],
  },
  {
    question:
      'The two error prevention tools associated with the first safety principle “S” - “Support the team” are peer check, peer coach, and _____?',
    options: [
      { key: 'A', label: 'Debrief' },
      { key: 'B', label: 'ARCC' },
      { key: 'C', label: 'SBAR' },
      { key: 'D', label: 'STAR' },
    ],
  },
  {
    question:
      'The two error prevention tools associated with the second safety principle “A” - “Ask Questions” are ARCC and _____?',
    options: [
      { key: 'A', label: 'Validate and Verify' },
      { key: 'B', label: 'SBAR' },
      { key: 'C', label: 'ARCC' },
      { key: 'D', label: 'STAR' },
    ],
  },
  {
    question:
      'The two error prevention tools associated with the third safety principle “F” - “Focus on the task” are STAR and _____?',
    options: [
      { key: 'A', label: 'No Distraction Zone' },
      { key: 'B', label: 'SBAR' },
      { key: 'C', label: 'ARCC' },
      { key: 'D', label: 'Debrief' },
    ],
  },
  {
    question:
      'A peer check is when you 1) ask your colleagues to review your work and offer assistance in reviewing the work of others. True or False?',
    options: [
      { key: 'A', label: 'True' },
      { key: 'B', label: 'False' },
    ],
  },
  {
    question:
      'In peer coaching, you can coach to reinforce (celebrate it publicly when someone does something correctly) or coach to correct (correct someone privately if possible when something is done incorrectly). True or False?',
    options: [
      { key: 'A', label: 'True' },
      { key: 'B', label: 'False' },
    ],
  },
  {
    question: 'Which of the following is a good practice for a debrief?',
    options: [
      { key: 'A', label: 'All three below are good practice for debrief' },
      { key: 'B', label: 'Last only 3 minutes' },
      {
        key: 'C',
        label:
          'Senior member speaks last so that all team members will freely speak up.',
      },
      {
        key: 'D',
        label:
          'Should be structured by asking: What went well, What did not go well, and Who will follow through?',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT an escalation step in ARCC?',
    options: [
      { key: 'A', label: 'All four steps below are valid' },
      {
        key: 'B',
        label:
          'Ask a question to gently prompt the other person of a potential safety issue',
      },
      {
        key: 'C',
        label:
          'Request a change to make the person fully aware of the risk',
      },
      {
        key: 'D',
        label:
          'Voice a concern if the person is resistant',
      },
      {
        key: 'E',
        label:
          'Use the chain of command if the possibility of patient harm persists',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT an important step in STAR?',
    options: [
      { key: 'A', label: 'All four steps below are correct' },
      {
        key: 'B',
        label:
          'Stop – pause for two seconds to focus your attention on the task at hand',
      },
      {
        key: 'C',
        label: 'Think – consider the actions you\'re about to take',
      },
      {
        key: 'D',
        label: 'Act – concentrate and carry out the task',
      },
      {
        key: 'E',
        label:
          'Review – check to make sure that the task was done right and you got the right result',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT an important principle that makes an effective handoff?',
    options: [
      { key: 'A', label: 'All six principles below are effective' },
      {
        key: 'B',
        label:
          'Standardized and streamlined: concise communication ensures only the critical and necessary information is included.',
      },
      {
        key: 'C',
        label:
          'Distraction free environment: conduct handoffs in a “no distraction zone”',
      },
      {
        key: 'D',
        label:
          'Face to face/bedside (interactive): ensure the receiver can validate, verify, or ask clarifying questions.',
      },
      {
        key: 'E',
        label:
          'Acknowledgements/repeat backs: communication without acknowledgement ISN’T communication',
      },
      {
        key: 'F',
        label:
          'Verbal written/printed information: best retention if possible',
      },
      {
        key: 'G',
        label:
          'Opportunity for questions/clarification: ask “What questions do you have?”',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT a step in Read and Repeat Back communication?',
    options: [
      { key: 'A', label: 'All 3 below are steps in Read and Repeat Back communication' },
      {
        key: 'B',
        label: 'Sender communicates information to receiver',
      },
      {
        key: 'C',
        label:
          'Receiver listens or writes down the information and reads/repeats it back',
      },
      {
        key: 'D',
        label:
          'Sender acknowledges the accuracy of the read-back by stating “That’s correct”',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT a part of the SBAR technique?',
    options: [
      { key: 'A', label: 'All four parts below are part of the SBAR technique' },
      {
        key: 'B',
        label: 'Situation: what is the situation, patient, or project?',
      },
      {
        key: 'C',
        label:
          'Background: what is important to communicate including problems and precautions?',
      },
      {
        key: 'D',
        label:
          'Assessment: what is my assessment of the situation, problems, and precautions?',
      },
      {
        key: 'E',
        label:
          'Recommendations: what is my recommendation, request, or plan?',
      },
    ],
  },
  {
    question:
      'Which of the following is NOT a situation in which asking a clarifying question would be important?',
    options: [
      { key: 'A', label: 'All three below are important situations where asking a clarifying question would be important' },
      {
        key: 'B',
        label: 'When in unexpected high-risk situations',
      },
      {
        key: 'C',
        label: 'When information is incomplete',
      },
      {
        key: 'D',
        label: 'When information is ambiguous',
      },
    ],
  },
];

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
  const [showPreAssessment, setShowPreAssessment] = useState(false);
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

  // New State to track current safety question
  const [currentSafetyQuestionIndex, setCurrentSafetyQuestionIndex] = useState(0);

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
    setShowPreAssessment(true);
    setShowSafetyStatement(false);
  };

  // Handle submitting pre-assessment
  const handleSubmitPreAssessment = async () => {
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
      setShowPreAssessment(false);
      setShowCaseStudies(true);
      setCurrentCaseStudyIndex(0);
      setCurrentQuestionIndex(0);
      setCurrentSafetyQuestionIndex(0); // Reset safety question index
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer changes
  const handleAnswerChange = (section, index, selectedOption) => {
    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [section]: {
        ...prevAnswers[section],
        [index]: selectedOption,
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
    if (showPreAssessment) {
      if (currentSafetyQuestionIndex > 0) {
        setCurrentSafetyQuestionIndex(currentSafetyQuestionIndex - 1);
      }
    } else if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    if (showPreAssessment) {
      if (currentSafetyQuestionIndex < safetyQuestions.length - 1) {
        setCurrentSafetyQuestionIndex(currentSafetyQuestionIndex + 1);
      }
    } else if (
      currentCaseStudy &&
      currentCaseStudy.questions &&
      currentQuestionIndex < currentCaseStudy.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Handle submitting the assessment
  const handleSubmitAssessment = () => {
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
      setCurrentSafetyQuestionIndex(0);
    }, 3000);
  };

  // Current Case Study
  const currentCaseStudy = caseStudies[currentCaseStudyIndex];

  // Current Safety Question
  const currentSafetyQuestion = safetyQuestions[currentSafetyQuestionIndex];

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

        {/* Take Assessment Button */}
        <Box my={4} display="flex" justifyContent="center">
          {!showPreAssessment && !showCaseStudies && (
            <Button
              type="button"
              variant="contained"
              color="primary"
              onClick={handleTakeAssessment}
              disabled={isLoading}
              size="large"
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

        {/* Error Alert */}
        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Safety Questions Page */}
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
            {safetyQuestions.length > 0 ? (
              <Box>
                <Box
                  mt={2}
                  p={2}
                  sx={{ backgroundColor: '#f0f0f0', borderRadius: 2 }}
                >
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                  >
                    {`Question ${currentSafetyQuestionIndex + 1} of ${safetyQuestions.length}`}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {currentSafetyQuestion.question}
                  </Typography>
                  <RadioGroup
                    value={
                      selectedAnswers['preAssessment']?.[currentSafetyQuestionIndex] || ''
                    }
                    onChange={(e) =>
                      handleAnswerChange('preAssessment', currentSafetyQuestionIndex, e.target.value)
                    }
                  >
                    {currentSafetyQuestion.options.map((option) => (
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

                {/* Navigation Buttons */}
                <Box
                  mt={4}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Button
                    type="button"
                    variant="contained"
                    color="secondary"
                    onClick={handlePreviousQuestion}
                    disabled={currentSafetyQuestionIndex === 0}
                    size="small"
                    sx={{ padding: '6px 20px', fontSize: '0.875rem', marginRight: 1 }}
                  >
                    Previous Question
                  </Button>

                  {currentSafetyQuestionIndex < safetyQuestions.length - 1 ? (
                    <Button
                      type="button"
                      variant="contained"
                      color="secondary"
                      onClick={handleNextQuestion}
                      size="small"
                      sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
                      disabled={
                        !selectedAnswers['preAssessment']?.[currentSafetyQuestionIndex]
                      }
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitPreAssessment}
                      size="large"
                      sx={{ padding: '10px 30px', fontSize: '1rem' }}
                      disabled={
                        !selectedAnswers['preAssessment']?.[currentSafetyQuestionIndex]
                      }
                    >
                      {isLoading
                        ? 'Submitting your pre-assessment, please wait.'
                        : 'Submit: Part I'}
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No pre-assessment questions available.
              </Typography>
            )}
          </Box>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Box mt={4} display="flex" justifyContent="center">
            <Typography variant="h6" color="primary" align="center">
              Starting your assessment in a few minutes, please wait.
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
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 'auto',
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
                    {currentCaseStudy.scenario.replace('Multiple Choice', '')}
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
                      <Typography variant="subtitle1" gutterBottom>
                        {currentCaseStudy.questions[currentQuestionIndex].question}
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
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        {/* Previous Question Button */}
                        <Button
                          type="button"
                          variant="contained"
                          color="secondary"
                          onClick={handlePreviousQuestion}
                          disabled={
                            showPreAssessment
                              ? currentSafetyQuestionIndex === 0
                              : currentQuestionIndex === 0
                          }
                          size="small"
                          sx={{ padding: '6px 20px', fontSize: '0.875rem', marginRight: 1 }}
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
                              showPreAssessment
                                ? currentSafetyQuestionIndex === safetyQuestions.length - 1
                                : currentQuestionIndex === currentCaseStudy.questions.length - 1
                            }
                            size="small"
                            sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
                          >
                            Next Question
                          </Button>
                        )}
                      </Box>

                      <Box>
                        {/* Previous Case Study Button */}
                        <Button
                          type="button"
                          variant="contained"
                          color="secondary"
                          onClick={handlePreviousCaseStudy}
                          disabled={currentCaseStudyIndex === 0}
                          size="small"
                          sx={{ padding: '6px 20px', fontSize: '0.875rem', marginRight: 1 }}
                        >
                          Previous Case Study
                        </Button>
                        {/* Next/Submit Case Study Button */}
                        {currentCaseStudyIndex === caseStudies.length - 1 ? (
                          <Button
                            type="button"
                            variant="contained"
                            color="primary"
                            onClick={handleSubmitAssessment}
                            size="small"
                            sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
                          >
                            Submit
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="contained"
                            color="primary"
                            onClick={handleNextCaseStudy}
                            size="small"
                            sx={{ padding: '6px 20px', fontSize: '0.875rem' }}
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

