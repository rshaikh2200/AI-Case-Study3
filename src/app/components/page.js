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
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

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
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showPreAssessment, setShowPreAssessment] = useState(false);
  const [showCaseStudies, setShowCaseStudies] = useState(false);
  const [showSafetyStatement, setShowSafetyStatement] = useState(true);

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

    if (!department || !role || !specialization) {
      setError('Please complete your profile before taking the assessment.');
      setIsLoading(false);
      return;
    }

    setShowPreAssessment(true);
    setShowSafetyStatement(false);
    setIsLoading(false);
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
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const currentCaseStudy = caseStudies[currentCaseStudyIndex];

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
        {showSafetyStatement && (
          <Typography variant="body1" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 4 }}>
            Avoidable medical errors in hospitals are the third leading cause of death in the USA. 99% of avoidable medical errors can be traced back to the misuse or lack of use of the 4 safety principles and corresponding 11 error prevention tools (EPTs). By understanding and using this safety language, harm to patients can be drastically reduced.
          </Typography>
        )}

        <Box my={4} display="flex" justifyContent="center">
          {!showPreAssessment && !showCaseStudies && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleTakeAssessment}
              disabled={isLoading}
              sx={{ padding: '10px 30px', fontSize: '1.2rem' }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Take Assessment'}
            </Button>
          )}
        </Box>

        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {showPreAssessment && !isLoading && (
          <Box mt={4} p={3} sx={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: 2, padding: 4 }}>
            <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
              Safety Principles Questions
            </Typography>
            {safetyQuestions.map((questionData, index) => (
              <Box key={index} mt={2} p={2} sx={{ backgroundColor: '#f0f0f0', borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
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
                      label={<Typography variant="body2">{option}</Typography>}
                      sx={{ marginBottom: 1 }}
                    />
                  ))}
                </RadioGroup>
              </Box>
            ))}

            <Box mt={4} display="flex" justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmitPreAssessment}
                sx={{ padding: '8px 16px' }}
              >
                Submit: Part I
              </Button>
            </Box>
          </Box>
        )}

        {isLoading && (
          <Box mt={4} display="flex" justifyContent="center">
            <CircularProgress size={40} />
          </Box>
        )}

        {showCaseStudies && caseStudies.length > 0 && currentCaseStudy && (
          <Box mt={4}>
            <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
              Case Study {currentCaseStudyIndex + 1}
            </Typography>
            <Typography variant="body1" gutterBottom sx={{ marginBottom: 3, fontSize: '1rem' }}>
              {currentCaseStudy.caseStudy}
            </Typography>

            <Typography variant="body1" gutterBottom>
              <strong>Scenario:</strong> {currentCaseStudy.scenario}
            </Typography>

            {currentCaseStudy.questions.map((questionData, qIndex) => (
              <Box key={qIndex} my={4} p={3} sx={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {`Question ${qIndex + 1}: ${questionData.question}`}
                </Typography>

                <RadioGroup
                  value={selectedAnswers[currentCaseStudyIndex] || ''}
                  onChange={(e) =>
                    setSelectedAnswers({
                      ...selectedAnswers,
                      [currentCaseStudyIndex]: e.target.value,
                    })
                  }
                >
                  {questionData.options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option.key}
                      control={<Radio />}
                      label={<Typography variant="body2">{option.label}</Typography>}
                      sx={{ marginBottom: 1 }}
                    />
                  ))}
                </RadioGroup>
              </Box>
            ))}

            <Box mt={4} display="flex" justifyContent="space-between">
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setCurrentCaseStudyIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentCaseStudyIndex === 0}
                sx={{ padding: '8px 16px' }}
              >
                Previous
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setCurrentCaseStudyIndex((prev) => Math.min(prev + 1, caseStudies.length - 1))}
                disabled={currentCaseStudyIndex === caseStudies.length - 1}
                sx={{ padding: '8px 16px' }}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
