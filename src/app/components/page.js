"use client";

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import Head from 'next/head';
import Link from 'next/link';

import {
  collection,
  addDoc,
  writeBatch,
  getDocs,
  query,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '../firebase';

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import Dialog from '@mui/material/Dialog';
import { Trophy, Menu, X } from 'lucide-react';

const CertificatePopup = ({ isOpen, onClose, fullName, date, onPrint }) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        className:
          "certificate-container border-4 border-gray-300 rounded-2xl shadow-lg p-6 bg-gradient-to-br from-white to-blue-50 max-w-md w-full",
        sx: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          margin: 0,
        },
      }}
      BackdropProps={{
        className: "bg-black/60",
        sx: { backdropFilter: "blur(4px)" },
      }}
    >
      <div className="certificate-popup">
        {/* Popup Header */}
        <div className="text-center py-6 bg-gradient-to-b from-blue-50 via-white to-transparent rounded-t-2xl border-b border-gray-100">
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-24 bg-yellow-100 rounded-full opacity-50 blur-xl" />
            <Trophy className="relative w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Congratulations!
          </h2>
        </div>

        {/* Certificate Content */}
        <div
          id="certificate"
          className="certificate-content mx-2 my-4 border-4 border-double border-gray-300 p-6 rounded-lg shadow-lg relative"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:60px_60px] bg-[position:0_0,30px_30px]" />
          </div>
          <div className="text-center mb-4 relative">
            <img
              src="/Picture1.jpg"
              alt="CoachCare.ai Logo"
              className="mx-auto h-20 mb-2 drop-shadow-md"
            />
          </div>
          <div className="text-center space-y-4 relative">
            <h2 className="text-3xl font-semibold text-gray-800 font-serif tracking-wide">
              Certificate of Completion
            </h2>
            <p className="text-xl text-gray-600">
              This certificate is proudly presented to you
            </p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent my-2 font-serif tracking-wide">
              {fullName}
            </p>
            <p className="text-xl leading-relaxed text-gray-700">
              For successfully completing the{" "}
              <span className="font-semibold">
                Patient Safety Language Basics
              </span>{" "}
              module.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-lg text-gray-600">
                Issued on: <span className="font-semibold">{date}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={onPrint}
            className="group relative px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform group-hover:rotate-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2-2H9a2 2-0-2 2v4a2 2 0 002 2zm8-12V5a2 2-2H9a2 2-2H2v4a2 2-2H9a2 2v2v0H8m4 0z"
                />
              </svg>
              Print Certificate
            </span>
          </button>
          <button
            onClick={onClose}
            className="group px-6 py-2 bg-white text-gray-700 rounded-xl font-semibold shadow-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Close
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default function Home() {
  // State Variables
  const [caseStudies, setCaseStudies] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCaseStudyIndex, setCurrentCaseStudyIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [userType, setUserType] = useState(''); // Kept for internal references, but no longer displayed
  const [showCaseStudies, setShowCaseStudies] = useState(false);
  const [showSafetyStatement, setShowSafetyStatement] = useState(true);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [userID, setUserID] = useState('');
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('english');
  const [showTranslate, setShowTranslate] = useState(true);
  const [care, setCare] = useState('');
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  
  // Audio-related states
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');
  
  // Question and scoring states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [feedbackMessages, setFeedbackMessages] = useState({});
  const [attempts, setAttempts] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [resultDetails, setResultDetails] = useState([]);
  const [currentResultCaseStudyIndex, setCurrentResultCaseStudyIndex] = useState(0);
  
  // Session and workflow states
  const [sessionID, setSessionID] = useState('');
  const [workflowData, setWorkflowData] = useState([]);

  const audioRef = useRef(null);

  // NEW state to track hovered option (for definitions).
  const [hoveredOption, setHoveredOption] = useState(null);

  // Definitions map
  const definitionsMap = {
    a: "Peer Checking and Coaching\nDefinition: Peer Check (Ask your colleagues to review your work and offer assistance in reviewing the work of others). Peer Coach (coach to reinforce: celebrate it publicly when someone does something correctly, coach to correct: correct someone (privately when possible) when something is done incorrectly.)",
    b: "Debrief\nDefinition: Reflect on what went well with team, what didn't, how to improve, and who will follow through. All team members should freely speak up. A debrief typically lasts only 3 minutes.",
    c: "ARCC\nDefinition: Ask a question to gently prompt the other person of potential safety issue, Request a change to make sure the person is fully aware of the risk. Voice a Concern if the person is resistant. Use the Chain of command if the possibility of patient harm persists.",
    d: "Validate and Verify\nDefinition: An internal Check (Does this make sense to me?, Is it right, based on what I know?, Is this what I expected?, Does this information 'fit in with my past experience or other information I may have at this time?). Verify (check with an independent qualified source).",
    e: "STAR\nDefinition: Stop (pause for 2 seconds to focus on task at hand), Think (consider action you're about to take), Act (concentrate and carry out the task), Review (check to make sure the task was done right and you got the right result).",
    f: "No Distraction Zone\nDefinition: 1) Avoid interrupting others while they are performing critical tasks 2) Avoid distractions while completing critical tasks: Use phrases like 'Stand by' or 'Hold on'.",
    g: "Effective Handoffs\nDefinition: Six important principles that make an Effective Handoff: Standardized and streamlined, Distraction-Free Environment, Face-to-face/bedside (interactive), Acknowledgments/repeat backs, Verbal with written/printed information, Opportunity for questions/clarification.",
    h: "Read and Repeat Back\nDefinition: 1) Sender communicates information to receiver, 2) receiver listens or writes down the information and reads/repeats it back as written or heard to the sender. 3) Sender then acknowledges the accuracy of the read-back by stating 'that's correct'. If not correct the sender repeats/clarifies the communication beginning the three steps again.",
    i: "Ask Clarifying Questions\nDefinition: Requesting Additional information, and expressing concerns to avoid misunderstandings.",
    j: "Using Alphanumeric Language\nDefinition: Consists of using clear letters and numbers in communication such as replacing fifteen with one-five, and using phonetic alphabet letters instead of Latin alphabet.",
    k: "SBAR\nDefinition: Situation (what is the situation, patient or project?), Background (what is important to communicate including problems and precautions?), Assessment (what is my assessment of the situation, problems, and precautions?), Recommendations (what is my recommendation, request, or plan?).",
  };

  useEffect(() => {
    if (assessmentComplete && totalScore >= 70) {
      setIsCertificateOpen(true);
    }
  }, [assessmentComplete, totalScore]);

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
        // Check if MediaSource is supported
        if ('MediaSource' in window && response.body) {
          // Existing streaming implementation
          const mediaSource = new MediaSource();
          const url = URL.createObjectURL(mediaSource);
          setAudioUrl(url);

          mediaSource.addEventListener('sourceopen', () => {
            const mimeCodec = 'audio/mpeg'; // Adjust if necessary
            if (MediaSource.isTypeSupported(mimeCodec)) {
              const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

              let queue = [];
              let isUpdating = false;

              const reader = response.body.getReader();

              const readChunk = ({ done, value }) => {
                if (done) {
                  if (!sourceBuffer.updating) {
                    mediaSource.endOfStream();
                  } else {
                    sourceBuffer.addEventListener(
                      'updateend',
                      () => {
                        mediaSource.endOfStream();
                      },
                      { once: true }
                    );
                  }
                  return;
                }

                queue.push(value);
                processQueue();
                reader.read().then(readChunk);
              };

              const processQueue = () => {
                if (isUpdating || queue.length === 0) {
                  return;
                }
                isUpdating = true;
                sourceBuffer.appendBuffer(queue.shift());
              };

              sourceBuffer.addEventListener('updateend', () => {
                isUpdating = false;
                processQueue();
              });

              reader.read().then(readChunk);
            } else {
              console.error('MIME type not supported:', mimeCodec);
              setAudioError('Audio format not supported on this device.');
              mediaSource.endOfStream('network');
            }
          });

          return url;
        } else {
          // Fallback for mobile browsers: Fetch as Blob
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          return url;
        }
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsAudioPlaying(false);
    } else {
      // Generate new speech URL for the current case study
      const url = await generateSpeech();
      if (url) {
        if (audioRef.current) {
          playAudio(url);
        }
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
        audioRef.current.load();
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

  // Function to save user inputs to Firestore
  const saveUserInputs = async () => {
    try {
      await addDoc(collection(firestore, 'user_profile'), {
        userID,
        fullName,
        language,
        userType, // still saved, even though no dropdown
        department,
        role,
        specialization,
      });
      console.log('User inputs saved successfully.');
    } catch (error) {
      console.error('Error saving user inputs:', error.message);
      setError('Failed to save your inputs. Please try again.');
      throw error;
    }
  };

  // Function to save AI response to Firestore
  const saveAiResponse = async () => {
    if (!aiResponse) return;

    try {
      await addDoc(collection(firestore, 'ai_responses'), {
        aiResponse,
        sessionID,
      });
      console.log('AI response saved successfully.');
    } catch (error) {
      console.error('Error saving AI response:', error.message);
    }
  };

  // Function to save case studies to a collection based on user selection
  const saveCaseStudies = async () => {
    if (!caseStudies || caseStudies.length === 0) return;

    try {
      // Construct the collection name based on user selection
      const collectionName = `${department || 'unknownDepartment'}_${role || 'unknownRole'}_${
        specialization || 'unknownSpecialization'
      }`;
      const sanitizedCollectionName = collectionName.replace(/[^a-zA-Z0-9_]/g, '_');

      // Initialize batch for the new collection
      const batch = writeBatch(firestore);
      const userCaseStudiesCollection = collection(firestore, sanitizedCollectionName);

      caseStudies.forEach((caseStudy) => {
        const docRef = doc(userCaseStudiesCollection);
        batch.set(docRef, {
          ...caseStudy,
          sessionID,
        });
      });

      // Commit the batch
      await batch.commit();

      console.log(`Case studies saved to ${sanitizedCollectionName} collection successfully.`);
    } catch (error) {
      console.error('Error saving case studies:', error.message);
      setError('Failed to save case studies. Please try again.');
      throw error;
    }
  };

  // Function to save session data to Firestore
  const saveSessionData = async (sessionID) => {
    try {
      await addDoc(collection(firestore, 'session table'), {
        sessionID: sessionID,
        employeeID: userID,
        startTime: new Date(),
      });
      console.log('Session data saved successfully.');
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  // Function to save workflow data to Firestore
  const saveWorkflowData = async (data) => {
    try {
      const docRef = doc(firestore, 'workflowData', `${sessionID}_${data.workflowID}`);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error('Error saving workflow data:', error);
    }
  };

  // Function to get Workflow ID
  const getWorkflowID = (caseIndex, questionIndex) => {
    let count = 1; // Start from 1 because 'Take Assessment' is at index 0
    for (let i = 0; i < caseIndex; i++) {
      count += caseStudies[i].questions.length;
    }
    count += questionIndex;
    return workflowData[count]?.workflowID || '';
  };

  // Function to get Workflow Name
  const getWorkflowName = (caseIndex, questionIndex) => {
    return `Case${caseIndex + 1}-Question${questionIndex + 1}`;
  };

  // Handle taking the assessment
  const handleTakeAssessment = () => {
    // Removed User Type checks so Department can be selected freely
    if (!role || !department) {
      setError('Please select your Role and Department before proceeding.');
      return;
    }

    // Removed userType-specific specialization check
    // Just check if specialization is selected if you want to enforce it:
    if (!specialization) {
      setError('Please select your Specialization before proceeding.');
      return;
    }

    saveUserInputs();

    const randomSessionID = Math.floor(100000 + Math.random() * 900000).toString();
    setSessionID(randomSessionID);
    saveSessionData(randomSessionID);

    handleSubmitAssessment();
    // Hide the Google Translate menu after clicking the button
    setShowTranslate(false);
  };

  // Function to get case studies from the server (called from handleTakeAssessment)
  const handleSubmitAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // userType still sent, even though no dropdown is displayed
        body: JSON.stringify({ userType, department, role, specialization }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to fetch case studies: ${errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (!data.caseStudies || !Array.isArray(data.caseStudies)) {
        throw new Error('Invalid data format received from server.');
      }

      const { caseStudies, aiResponse } = data;

      setCaseStudies(caseStudies);
      setAiResponse(aiResponse);

      // Generate workflow data
      const workflowNames = ['Take Assessment'];

      data.caseStudies.forEach((caseStudy, caseIndex) => {
        caseStudy.questions.forEach((question, questionIndex) => {
          const workflowName = `Case${caseIndex + 1}-Question${questionIndex + 1}`;
          workflowNames.push(workflowName);
        });
      });

      const workflows = workflowNames.map((name) => ({
        workflowID: Math.floor(100000 + Math.random() * 900000).toString(),
        workflowName: name,
      }));

      setWorkflowData(workflows);

      await saveAiResponse(); // Save AI response

      setShowSafetyStatement(false);
      setShowCaseStudies(true);
      setCurrentCaseStudyIndex(0);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Error fetching case studies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Function to generate and open PDF of "case studies and questions" WITHOUT displaying them
  const handlePrintCaseStudiesAndQuestions = async () => {
    // We replicate the same logic as handleTakeAssessment but won't show the case studies in the UI.
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!role || !department) {
      setError('Please select your Role and Department before proceeding.');
      setIsLoading(false);
      return;
    }

    if (!specialization) {
      setError('Please select your Specialization before proceeding.');
      setIsLoading(false);
      return;
    }

    try {
      // Save user inputs and set up session data
      await saveUserInputs();
      const randomSessionID = Math.floor(100000 + Math.random() * 900000).toString();
      setSessionID(randomSessionID);
      await saveSessionData(randomSessionID);

      // Fetch the personalized scenarios
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, department, role, specialization }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to fetch case studies: ${errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();
      if (!data.caseStudies || !Array.isArray(data.caseStudies)) {
        throw new Error('Invalid data format received from server.');
      }
      const { caseStudies, aiResponse } = data;

      setCaseStudies(caseStudies);
      setAiResponse(aiResponse);

      // We do NOT set showSafetyStatement(false) nor showCaseStudies(true)
      // because we only want to print them, not display them in the UI.

      // Build a PDF of the case studies + questions
      const docPDF = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Title
      docPDF.setFontSize(14);
      docPDF.setFont('helvetica', 'bold');
      docPDF.text('Personalized Case Studies & Questions', pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 10;

      // Basic user info
      docPDF.setFontSize(10);
      docPDF.setFont('helvetica', 'normal');
      docPDF.text(`Full Name: ${fullName}`, margin, yPosition);
      yPosition += 5;
      docPDF.text(`User ID: ${userID}`, margin, yPosition);
      yPosition += 5;
      docPDF.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 10;

      // Loop through caseStudies, list scenario + questions
      caseStudies.forEach((cs, index) => {
        if (index !== 0) {
          docPDF.addPage();
          yPosition = margin;
        }

        // Case Study title
        docPDF.setFontSize(12);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text(`Case Study ${index + 1}`, margin, yPosition);
        yPosition += 6;

        // Scenario
        docPDF.setFontSize(10);
        docPDF.setFont('helvetica', 'normal');
        const scenarioLines = docPDF.splitTextToSize(cs.scenario, pageWidth - margin * 2);
        docPDF.text(scenarioLines, margin, yPosition);
        yPosition += scenarioLines.length * 5 + 5;

        // Questions
        cs.questions.forEach((q, qIndex) => {
          if (yPosition > pageHeight - margin - 30) {
            docPDF.addPage();
            yPosition = margin;
          }

          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'bold');
          docPDF.text(`Question ${qIndex + 1}:`, margin, yPosition);
          yPosition += 5;

          docPDF.setFont('helvetica', 'normal');
          const questionLines = docPDF.splitTextToSize(q.question, pageWidth - margin * 2);
          docPDF.text(questionLines, margin + 5, yPosition);
          yPosition += questionLines.length * 5 + 3;

          // List the options
          q.options.forEach((opt) => {
            if (yPosition > pageHeight - margin - 20) {
              docPDF.addPage();
              yPosition = margin;
            }
            const optionText = `${opt.key}. ${opt.label}`;
            const optionLines = docPDF.splitTextToSize(optionText, pageWidth - margin * 2 - 5);
            docPDF.text(optionLines, margin + 10, yPosition);
            yPosition += optionLines.length * 5 + 2;
          });

          yPosition += 3; // extra gap
        });
      });

      // Open the PDF in a new tab
      const blobUrl = docPDF.output('bloburl');
      window.open(blobUrl, '_blank');

    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error('Error fetching/printing case studies:', err);
    } finally {
      setIsLoading(false);
      setShowTranslate(false);
    }
  };

  // Modified handleAnswerChange function
  const handleAnswerChange = (caseIndex, questionIndex, selectedOption) => {
    const key = `${caseIndex}-${questionIndex}`;
    const currentAttempts = attempts[key] || 0;

    const previousFeedback = feedbackMessages[caseIndex]?.[questionIndex];

    if (
      currentAttempts >= 2 ||
      (previousFeedback && previousFeedback.message === 'Correct Answer')
    ) {
      setError('No more tries left!');
      return;
    }

    // Clear any previous error
    setError(null);

    // Cross-check with correctAnswer from aiResponse
    const correctAnswer = aiResponse[caseIndex].questions[questionIndex].correctAnswer;
    const correctKey = correctAnswer.split(')')[0].trim(); // Extract the key (e.g., 'C')

    const hint = aiResponse[caseIndex].questions[questionIndex].hint;

    let feedbackMessageNew = '';
    let hintToShow = '';

    const isCorrect = selectedOption === correctKey;

    if (isCorrect) {
      feedbackMessageNew = 'Correct Answer';
      hintToShow = '';
    } else {
      const attemptsLeft = 2 - currentAttempts - 1;
      hintToShow = hint;
      if (attemptsLeft > 0) {
        feedbackMessageNew = `Incorrect Answer. ${attemptsLeft} try left.`;
      } else {
        feedbackMessageNew = 'Incorrect Answer. No more tries left!';
      }
    }

    setFeedbackMessages((prevFeedback) => ({
      ...prevFeedback,
      [caseIndex]: {
        ...prevFeedback[caseIndex],
        [questionIndex]: {
          message: feedbackMessageNew,
          hint: hintToShow,
        },
      },
    }));

    setAttempts((prevAttempts) => ({
      ...prevAttempts,
      [key]: currentAttempts + 1,
    }));

    setSelectedAnswers((prevAnswers) => ({
      ...prevAnswers,
      [caseIndex]: {
        ...prevAnswers[caseIndex],
        [questionIndex]: selectedOption,
      },
    }));

    // Save workflow data
    const workflowID = getWorkflowID(caseIndex, questionIndex);
    const workflowName = getWorkflowName(caseIndex, questionIndex);
    const timestamp = new Date();
    const isFirstAttempt = currentAttempts === 0;

    const dataToSave = {
      workflowID: workflowID,
      sessionID: sessionID,
      workflowName: workflowName,
    };

    if (isFirstAttempt) {
      dataToSave.attempt1Selection = 'yes';
      dataToSave.attempt1Timestamp = timestamp;
      dataToSave.attempt1Answer = selectedOption;
      dataToSave.attempt1Result = isCorrect ? 'Correct' : 'Incorrect';
      dataToSave.secondAttemptMade = 'no';
    } else {
      dataToSave.attempt2Selection = 'yes';
      dataToSave.attempt2Timestamp = timestamp;
      dataToSave.attempt2Answer = selectedOption;
      dataToSave.attempt2Result = isCorrect ? 'Correct' : 'Incorrect';
      dataToSave.secondAttemptMade = 'yes';
    }

    saveWorkflowData(dataToSave);

    // Move to next question or case study after 1 second if correct or out of attempts
    if (isCorrect || currentAttempts + 1 >= 2) {
      setTimeout(() => {
        const workflowID = getWorkflowID(caseIndex, questionIndex);
        const workflowName = getWorkflowName(caseIndex, questionIndex);
        const timestamp = new Date();

        const dataToSave = {
          workflowID: workflowID,
          sessionID: sessionID,
          workflowName: workflowName,
          nextButtonTimestamp: timestamp,
        };

        saveWorkflowData(dataToSave);

        const isLastQuestionInCaseStudy =
          questionIndex === caseStudies[caseIndex].questions.length - 1;

        const isLastCaseStudy = caseIndex === caseStudies.length - 1;

        if (isLastQuestionInCaseStudy && isLastCaseStudy) {
          handleSubmitFinalAssessment();
        } else if (isLastQuestionInCaseStudy) {
          setCurrentCaseStudyIndex((prevIndex) => prevIndex + 1);
          setCurrentQuestionIndex(0);
        } else {
          setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        }
      }, 1000);
    }
  };

  // Function to calculate the score
  const calculateScore = () => {
    let score = 0;
    let totalQuestions = 0;
    const details = [];

    caseStudies.forEach((caseStudy, caseIndex) => {
      const caseDetail = {
        caseStudyNumber: caseIndex + 1,
        questions: [],
        patientName: caseStudy.patientName || 'Patient: Unknown',
        caseStudyText: caseStudy.scenario || 'No Scenario',
      };

      const questions = caseStudy.questions;
      totalQuestions += questions.length;

      questions.forEach((question, questionIndex) => {
        const userAnswer = selectedAnswers[caseIndex]?.[questionIndex];
        const correctAnswer = aiResponse[caseIndex].questions[questionIndex].correctAnswer;
        const correctKey = correctAnswer.split(')')[0].trim();

        const feedbackMessage = feedbackMessages[caseIndex]?.[questionIndex];

        let isCorrect = false;
        if (feedbackMessage?.message === 'Correct Answer') {
          isCorrect = true;
          score += 1;
        }

        caseDetail.questions.push({
          questionNumber: questionIndex + 1,
          questionText: question.question,
          selectedAnswer: userAnswer || 'No Answer',
          isCorrect: isCorrect,
        });
      });

      details.push(caseDetail);
    });

    const percentageScore = Math.round((score / totalQuestions) * 100);
    setTotalScore(percentageScore);
    setCorrectCount(score);
    setResultDetails(details);
  };

  // Handle submitting the final assessment
  const handleSubmitFinalAssessment = () => {
    setTimeout(() => {
      proceedWithSubmission();
    }, 1000);
  };

  // Function to proceed with submission
  const proceedWithSubmission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await saveCaseStudies();
      await saveAiResponse();

      // Save Submit Button Timestamp
      const lastCaseIndex = caseStudies.length - 1;
      const lastQuestionIndex = caseStudies[lastCaseIndex].questions.length - 1;
      const workflowID = getWorkflowID(lastCaseIndex, lastQuestionIndex);
      const workflowName = getWorkflowName(lastCaseIndex, lastQuestionIndex);
      const timestamp = new Date();

      const dataToSave = {
        workflowID: workflowID,
        sessionID: sessionID,
        workflowName: workflowName,
        submitButtonTimestamp: timestamp,
      };

      await saveWorkflowData(dataToSave);

      setAssessmentComplete(true);
      setShowCaseStudies(false);
      setShowSafetyStatement(false);
      calculateScore();
    } catch (err) {
      setError(err.message || 'An error occurred during submission.');
      console.error('Error during submission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToMainPage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUserType('');
      setDepartment('');
      setRole('');
      setSpecialization('');
      setCaseStudies([]);
      setSelectedAnswers({});
      setFeedbackMessages({});
      setAttempts({});
      setAssessmentComplete(false);
      setShowSafetyStatement(true);
      setShowCaseStudies(false);
      setResultDetails([]);
      setTotalScore(0);
      setCorrectCount(0);
      setCurrentResultCaseStudyIndex(0);
      setFullName('');
    } catch (err) {
      setError(err.message || 'Failed to navigate back to the main page.');
      console.error('Error navigating back:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete collection function (unused, remains intact)
  const deleteAllDocumentsInCollection = async (collectionName) => {
    const collectionRef = collection(firestore, collectionName);
    const q = query(collectionRef);
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  };

  // handlePrint function (unchanged aside from context usage)
  const handlePrint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docPDF = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Add User Information
      docPDF.setFontSize(10);
      docPDF.setFont('helvetica', 'bold');
      docPDF.text(`Full Name: ${fullName}`, margin, yPosition);
      yPosition += 6;
      docPDF.text(`User ID: ${userID}`, margin, yPosition);
      yPosition += 6;
      docPDF.text(`Assessment Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;

      // Add Title
      docPDF.setFontSize(14);
      docPDF.setFont('helvetica', 'bold');
      docPDF.text('Safety Assessment Report', pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 8;

      // Add Total Score
      docPDF.setFontSize(12);
      docPDF.setFont('helvetica', 'normal');
      docPDF.text(`Total Score: ${totalScore}%`, pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 8;

      // Horizontal line
      docPDF.setLineWidth(0.3);
      docPDF.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Case details
      resultDetails.forEach((caseDetail, index) => {
        if (index !== 0) {
          docPDF.addPage();
          yPosition = margin;
        }

        const caseStudy = caseStudies[index];

        // Case Study Title
        docPDF.setFontSize(12);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text(`Case Study ${caseDetail.caseStudyNumber}`, margin, yPosition);
        yPosition += 6;

        // Scenario
        docPDF.setFontSize(10);
        docPDF.setFont('helvetica', 'normal');
        const splitScenarioText = docPDF.splitTextToSize(
          caseStudy.scenario,
          pageWidth - 2 * margin
        );
        docPDF.text(splitScenarioText, margin, yPosition);
        yPosition += splitScenarioText.length * 5 + 2;

        // Questions
        caseDetail.questions.forEach((question) => {
          const questionNumber = question.questionNumber;
          const questionText = question.questionText;
          const userAnswerKey = question.selectedAnswer;
          const correctAnswerKey = aiResponse[caseDetail.caseStudyNumber - 1].questions[
            questionNumber - 1
          ].correctAnswer.split(')')[0].trim();

          // Retrieve full text for user answer
          const userOption = caseStudies[index].questions[questionNumber - 1].options.find(
            (opt) => opt.key === userAnswerKey
          );
          const userAnswerText = userOption
            ? `${userOption.key}. ${userOption.label}`
            : 'No Answer';

          // Retrieve full text for correct answer
          const correctOption = caseStudies[index].questions[questionNumber - 1].options.find(
            (opt) => opt.key === correctAnswerKey
          );
          const correctAnswerText = correctOption
            ? `${correctOption.key}. ${correctOption.label}`
            : 'No Answer';

          // Question text
          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'bold');
          const questionHeader = `Question ${questionNumber}: ${questionText}`;
          const splitQuestionHeader = docPDF.splitTextToSize(
            questionHeader,
            pageWidth - 2 * margin
          );
          docPDF.text(splitQuestionHeader, margin, yPosition);
          yPosition += splitQuestionHeader.length * 4 + 2;

          // User Answer
          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'bold');
          docPDF.text('Your Answer:', margin + 2, yPosition);
          yPosition += 4;

          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'normal');
          const splitUserAnswer = docPDF.splitTextToSize(
            userAnswerText,
            pageWidth - 2 * margin - 4
          );
          docPDF.text(splitUserAnswer, margin + 4, yPosition);
          yPosition += splitUserAnswer.length * 4 + 2;

          // Correct Answer
          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'bold');
          docPDF.text('Correct Answer:', margin + 2, yPosition);
          yPosition += 4;

          docPDF.setFontSize(10);
          docPDF.setFont('helvetica', 'normal');
          const splitCorrectAnswer = docPDF.splitTextToSize(
            correctAnswerText,
            pageWidth - 2 * margin - 4
          );
          docPDF.text(splitCorrectAnswer, margin + 4, yPosition);
          yPosition += splitCorrectAnswer.length * 4 + 6;

          if (yPosition > pageHeight - margin - 20) {
            // Basic pagination logic
            docPDF.addPage();
            yPosition = margin;
          }
        });
      });

      const fileName = `Safety_Assessment_Report_${fullName.replace(/\s+/g, '_')}_${new Date()
        .toLocaleDateString()
        .replace(/\//g, '-')}.pdf`;
      docPDF.save(fileName);
    } catch (err) {
      setError(err.message || 'Failed to generate PDF.');
      console.error('Error generating PDF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintCertificate = () => {
    const certificateElement = document.getElementById("certificate");

    if (certificateElement) {
      const printWindow = window.open("", "PRINT", "width=800,height=600");
      printWindow.document.write(
        `<html>
        <head>
          <title>Coachcare.ai</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Helvetica', 'Arial', sans-serif;
            }
            .certificate-container {
              border: 4px solid #d1d5db;
              border-radius: 1rem;
              box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
              padding: 2rem;
              background: linear-gradient(to bottom right, white, #bfdbfe);
              max-width: 768px;
              width: 100%;
              margin: 2rem auto;
            }
            .certificate-popup {
              position: relative;
            }
            .certificate-content {
              position: relative;
              z-index: 10;
            }
            .absolute-inset {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              opacity: 0.05;
              background: repeating-linear-gradient(
                45deg,
                #000,
                #000 25%,
                transparent 25%,
                transparent 50%,
                #000 50%,
                #000 75%,
                transparent 75%,
                transparent
              );
              background-size: 60px 60px;
            }
            .text-center {
              text-align: center;
            }
            .py-10 {
              padding-top: 2.5rem;
              padding-bottom: 2.5rem;
            }
            .bg-gradient-to-b {
              background: linear-gradient(to bottom, #dbeafe, white, transparent);
            }
            .rounded-t-2xl {
              border-top-left-radius: 1rem;
              border-top-right-radius: 1rem;
            }
            .border-b {
              border-bottom: 1px solid #d1d5db;
            }
            .text-4xl {
              font-size: 2.25rem;
            }
            .font-bold {
              font-weight: 700;
            }
            .bg-gradient-to-r {
              background: linear-gradient(to right, #059669, #2563eb);
            }
            .bg-clip-text {
              -webkit-background-clip: text;
              background-clip: text;
            }
            .text-transparent {
              color: transparent;
            }
            .font-semibold {
              font-weight: 600;
            }
            .font-serif {
              font-family: 'Times New Roman', Times, serif;
            }
            .tracking-wide {
              letter-spacing: 0.05em;
            }
            .p-8 {
              padding: 2rem;
            }
            .border-double {
              border-style: double;
            }
            .border-gray-300 {
              border-color: #d1d5db;
            }
            .rounded-lg {
              border-radius: 0.5rem;
            }
            .shadow-lg {
              box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            }
            .bg-yellow-100 {
              background-color: #fef3c7;
            }
            .rounded-full {
              border-radius: 9999px;
            }
            .opacity-50 {
              opacity: 0.5;
            }
            .blur-xl {
              filter: blur(20px);
            }
            .text-yellow-500 {
              color: #f59e0b;
            }
            .mx-auto {
              margin-left: auto;
              margin-right: auto;
            }
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            .animate-bounce {
              animation: bounce 2s infinite;
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            .certificate-content {
              position: relative;
            }
          </style>
        </head>
        <body>
          <div class="certificate-container">
            ${certificateElement.outerHTML}
          </div>
        </body>
        </html>`
      );
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Function to handle page refresh
  const handlePageRefresh = async () => {
    try {
      setUserType('');
      setDepartment('');
      setRole('');
      setSpecialization('');
      setCaseStudies([]);
      setSelectedAnswers({});
      setFeedbackMessages({});
      setAttempts({});
      setAssessmentComplete(false);
      setShowSafetyStatement(true);
      setShowCaseStudies(false);
      setResultDetails([]);
      setTotalScore(0);
      setCorrectCount(0);
      setCurrentResultCaseStudyIndex(0);
      setFullName('');
    } catch (err) {
      setError(err.message || 'Failed to navigate back to the main page.');
      console.error('Error navigating back:', err);
    }
  };

  // Handle reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0 && navigationEntries[0].type === 'reload') {
        handlePageRefresh();
      }
    }
  }, []);

  // Current Case Study
  const currentCaseStudy = caseStudies[currentCaseStudyIndex];
  const isLastQuestion =
    currentQuestionIndex === currentCaseStudy?.questions.length - 1;
  const isLastCaseStudy = currentCaseStudyIndex === caseStudies.length - 1;

  // Department/Role/Specialization map
  const departmentRoleSpecializationMap = {
    Radiology: {
      'Physician': [
        'Radiology'
      ],
      'Nurse Practitioner': [
        'Radiology'
      ],
      'Radiology Technician': [
        'Radiology'
      ],
      'Physican Associate': [
        'Radiology'
      ],
    },
    'Stroke Center': {
      'Medical Doctor': [
        'Neurology'
      ],
      'Nurse Practitioner': [
        'Neurology'
      ],
      'Physician Assistant': [
        'Neurology'
      ],
      'Registered Nurse': [
        'Neurology'
      ],
      'Tech Staff': [
        'Neurology'
      ],
    },
    'Operating Room': {
      'Surgeon': [
        'General Surgery',
        'Orthopedic Surgery',
        'Neurosurgery',
        'Cardiothoracic Surgery'
      ],
      'Nurse': [
        'Scrub Nurse',
        'Circulating Nurse',
        'Preoperative Nurse',
        'Post-Anesthesia Care Unit Nurse'
      ],
      'Circulator Nurse': [
        'General Surgery',
        'Orthopedic Surgery',
        'Neurosurgery',
        'Vascular Surgery'
      ],
      'Surgical Technologist': [
        'General Surgery',
        'Orthopedic Surgery',
        'Neurosurgery',
        'Cardiothoracic Surgery'
      ],
    },
    Transplant: {
      'Surgeon': [
        'Kidney Transplant',
        'Heart Transplant',
        'Liver Transplant',
        'Pediatric Transplant'
      ],
      'Nurse': [
        'Critical Care Transplant',
        'Organ Procurement',
        'Dialysis',
        'Oncology Transplant'
      ],
      'Surgical Technologist': [
        'Cardiothoracic Transplant',
        'Living Donor Transplant',
        'Pediatric Transplant',
        'Abdominal Transplant'
      ],
    },
  };

  // Departments for the dropdown (no longer filtered by userType)
  const departmentsToUse = Object.keys(departmentRoleSpecializationMap);

  const [rolesToUse, setRolesToUse] = useState([]);
  const [specializationsToUse, setSpecializationsToUse] = useState([]);

  useEffect(() => {
    if (department) {
      const roles = Object.keys(departmentRoleSpecializationMap[department] || {});
      setRolesToUse(roles);
    } else {
      setRolesToUse([]);
    }
    setRole('');
    setSpecialization('');
    setSpecializationsToUse([]);
  }, [department]);

  useEffect(() => {
    if (department && role) {
      const specializations =
        departmentRoleSpecializationMap[department][role] || [];
      setSpecializationsToUse(specializations);
    } else {
      setSpecializationsToUse([]);
    }
    setSpecialization('');
  }, [department, role]);

  useEffect(() => {
    const randomID = Math.floor(100000 + Math.random() * 900000).toString();
    setUserID(randomID);
  }, []);

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,es',
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        'google_translate_element'
      );
    };

    const handleLanguageChange = () => {
      const languageDropdown = document.querySelector('.goog-te-combo');
      if (languageDropdown) {
        setLanguage(languageDropdown.value);
      }
    };

    const languageDropdown = document.querySelector('.goog-te-combo');
    if (languageDropdown) {
      languageDropdown.addEventListener('change', handleLanguageChange);
      languageDropdown.style.fontSize = '20px';
    }

    return () => {
      if (languageDropdown) {
        languageDropdown.removeEventListener('change', handleLanguageChange);
      }
    };
  }, []);

  useEffect(() => {
    const applyCustomStyles = () => {
      const translateSelect = document.querySelector('.goog-te-combo');
      if (translateSelect) {
        translateSelect.style.fontSize = '64px';
        translateSelect.style.padding = '10px';
        translateSelect.style.height = '45px';
        translateSelect.style.width = '220px';
        translateSelect.style.backgroundColor = '#f0f0f0';
        translateSelect.style.borderRadius = '5px';
        translateSelect.style.border = '1px solid #ccc';

        const container = document.querySelector('.google-translate-element');
        if (container) {
          container.style.display = 'inline-block';
          container.style.marginBottom = '20px';
        }

        clearInterval(styleInterval);
      }
    };

    const styleInterval = setInterval(applyCustomStyles, 500);
    return () => clearInterval(styleInterval);
  }, [showTranslate]);

  const getOptionLabel = (caseIndex, questionIndex, optionKey) => {
    const option = caseStudies[caseIndex]?.questions[questionIndex]?.options.find(
      (opt) => opt.key === optionKey
    );
    return option ? `${option.key}. ${option.label}` : 'No Answer';
  };

  return (
    <>
      <Head>
        <title>Health Care Safety</title>
      </Head>
      <div className="container mx-auto px-4">
        {/* Responsive App Bar */}
        <nav className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <div className="flex-shrink-0 text-white font-bold">
                  <span className="hidden sm:block">
                    AI Personalized Healthcare Safety Module
                  </span>
                  <span className="block sm:hidden">Coachcare.ai</span>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="sm:hidden ml-4 mr-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white hover:text-gray-200 focus:outline-none"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:flex sm:items-center sm:space-x-4">
                <Link
                  href="/Home"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/components"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  Safety Module
                </Link>
                <Link
                  href="/dashboard"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/feedback"
                  className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  Feedback
                </Link>
              </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
              <div className="sm:hidden pb-4">
                <div className="flex flex-col space-y-2">
                  <Link
                    href="/"
                    className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/components"
                    className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Case Studies
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/feedback"
                    className="text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Feedback
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="content-wrapper">
          {/* Image and Assessment Complete Form Container */}
          <div className="image-container px-4 py-6">
            {showSafetyStatement && (
              <p className="safety-text text-sm sm:text-base text-gray-700 leading-relaxed">
                Avoidable medical error is a leading cause of death in the USA. Something as simple as
                using safety behaviors has been proven to decrease harm to patients. The scenarios generated
                below are from real case studies that have been published in the literature and are customized
                just for you in order to make the safety behavior more relevant. Thank you for doing your part to put more care into healthcare.
              </p>
            )}

            {assessmentComplete && (
              <div className="assessment-complete mt-6">
                <div className="result-container bg-white rounded-lg shadow p-6">
                  <div className="score-info text-center">
                    <div className="score-header text-xl font-semibold">
                      <strong>Score:</strong>
                    </div>

                    <div className="correct-answers text-2xl font-bold my-2">
                      {correctCount} out of 12
                    </div>

                    <div className="score-circle mx-auto my-4 w-24 h-24 flex items-center justify-center rounded-full bg-blue-100">
                      <span className="text-3xl font-bold text-blue-600">{totalScore}%</span>
                    </div>

                    <div className="result-header text-xl font-semibold">
                      <strong>Result:</strong>
                    </div>

                    <div
                      className={`pass-fail text-2xl font-bold mt-2 ${
                        totalScore >= 70 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {totalScore >= 70 ? 'Pass' : 'Fail'}
                    </div>
                  </div>
                </div>

                {resultDetails.map((caseDetail) => (
                  <div key={`case-${caseDetail.caseStudyNumber}`} className="case-detail mt-6">
                    <h3 className="text-lg font-semibold">{`Case Study ${caseDetail.caseStudyNumber}`}</h3>
                    <p className="case-study-text text-gray-700 mt-2">{caseDetail.caseStudyText}</p>

                    {caseDetail.questions.map((q) => (
                      <div key={`question-${q.questionNumber}`} className="question-summary mt-4">
                        <div className="question-header-summary flex justify-between items-center">
                          <h4 className="text-md font-semibold">{`Question ${q.questionNumber}`}</h4>
                          <span className="text-xl">{q.isCorrect ? '✅' : '❌'}</span>
                        </div>

                        <p className="question-text text-gray-700 mt-1">{q.questionText}</p>

                        <h5 className="mt-2 font-semibold">Your Answer:</h5>
                        <p className="user-answer text-gray-700">
                          {q.selectedAnswer !== 'No Answer'
                            ? getOptionLabel(
                                caseDetail.caseStudyNumber - 1,
                                q.questionNumber - 1,
                                q.selectedAnswer
                              )
                            : 'No Answer'}
                        </p>

                        <h5 className="mt-2 font-semibold">Correct Answer:</h5>
                        <p className="correct-answer text-gray-700">
                          {getOptionLabel(
                            caseDetail.caseStudyNumber - 1,
                            q.questionNumber - 1,
                            aiResponse[caseDetail.caseStudyNumber - 1].questions[
                              q.questionNumber - 1
                            ].correctAnswer.split(')')[0].trim()
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="result-buttons flex flex-col sm:flex-row items-center justify-center mt-6 space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    className="print-button bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    onClick={handlePrint}
                    disabled={isLoading}
                  >
                    🖨️ Print Assessment Report
                  </button>
                  {totalScore >= 70 && (
                    <button
                      className="certificate-button bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      onClick={() => setIsCertificateOpen(true)}
                      disabled={isLoading}
                    >
                      🎓 View Certificate
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {showSafetyStatement && (
            <div className="form-container px-4 py-6">
              <div className="professional-info bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Professional Information</h2>

                {/* Removed the User Type dropdown entirely */}

                <div className="form-item mb-4">
                  <label htmlFor="department-select" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <select
                    id="department-select"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (error) setError('');
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="">Select Department</option>
                    {departmentsToUse.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-item mb-4">
                  <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role-select"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={!department}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100"
                  >
                    <option value="">Select Role</option>
                    {rolesToUse.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Always show Specialization dropdown */}
                <div className="form-item mb-4">
                  <label htmlFor="specialization-select" className="block text-sm font-medium text-gray-700">
                    Specialization
                  </label>
                  <select
                    id="specialization-select"
                    value={specialization}
                    onChange={(e) => {
                      setSpecialization(e.target.value);
                      if (error) setError('');
                    }}
                    disabled={!role}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100"
                  >
                    <option value="">Select Specialization</option>
                    {specializationsToUse.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Renamed "Care" to "Care delivery setting" and removed the userType-based disable */}
                <div className="form-item mb-4">
                  <label htmlFor="care-select" className="block text-sm font-medium text-gray-700">
                    Care Delivery Setting
                  </label>
                  <select
                    id="care-select"
                    value={care}
                    onChange={(e) => {
                      setCare(e.target.value);
                      if (error) setError('');
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="">Select Care Delivery Setting</option>
                    <option value="Inpatient">Inpatient</option>
                    <option value="Outpatient">Outpatient</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="button-container text-center my-6">
            {showSafetyStatement && !showCaseStudies && !assessmentComplete && (
              <>
                <button
                  type="button"
                  className="assessment-button bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 mr-2"
                  onClick={handleTakeAssessment}
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Starting your assessment, please wait...'
                    : 'Generate My Personalized Training Scenarios'}
                </button>

                {/* NEW BUTTON: Print Case Studies and Questions */}
                <button
                  type="button"
                  className="print-cs-button bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
                  onClick={handlePrintCaseStudiesAndQuestions}
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Preparing PDF, please wait...'
                    : 'Print Case Studies and Questions'}
                </button>
              </>
            )}
          </div>

          {error && <div className="error-alert text-red-600 text-center">{error}</div>}

          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length > 0 && (
            <div className="case-studies px-4 py-6">
              <div className="case-study" key={currentCaseStudyIndex}>
                {aiResponse[currentCaseStudyIndex].imageUrl && (
                  <div className="case-study-image mb-4">
                    <img
                      src={aiResponse[currentCaseStudyIndex].imageUrl}
                      alt={`Case Study ${currentCaseStudyIndex + 1} Image`}
                      className="header-image w-full h-auto rounded-lg"
                    />
                  </div>
                )}

                <div className="case-study-header flex flex-col sm:flex-row justify-between items-center">
                  <h3 className="text-xl font-semibold">{`Case Study ${currentCaseStudyIndex + 1}`}</h3>
                  <button
                    type="button"
                    className="audio-button bg-blue-600 text-black px-4 py-2 rounded-md hover:bg-blue-700 mt-4 sm:mt-0"
                    onClick={fetchAudio}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <span>Loading...</span>
                    ) : isAudioPlaying ? (
                      <>
                        <span className="icon-volume-up"></span>
                        Pause
                      </>
                    ) : (
                      <>
                        <span className="icon-volume-off"></span>
                        Listen
                      </>
                    )}
                  </button>
                </div>

                <audio ref={audioRef} />

                {audioError && <div className="audio-error text-red-600">{audioError}</div>}

                <p className="case-study-scenario text-gray-700 mt-4">
                  {caseStudies[currentCaseStudyIndex].scenario}
                </p>

                {caseStudies[currentCaseStudyIndex].questions &&
                caseStudies[currentCaseStudyIndex].questions.length > 0 ? (
                  <div className="question-section mt-6">
                    <h4 className="question-header text-lg font-semibold">
                      {`Question ${currentQuestionIndex + 1}: ${
                        caseStudies[currentCaseStudyIndex].questions[currentQuestionIndex].question
                      }`}
                    </h4>

                    <div className="options-group mt-4 space-y-2">
                      {caseStudies[currentCaseStudyIndex].questions[currentQuestionIndex].options.map(
                        (option) => {
                          const key = `${currentCaseStudyIndex}-${currentQuestionIndex}`;
                          const currentAttempts = attempts[key] || 0;
                          const feedbackMessage =
                            feedbackMessages[currentCaseStudyIndex]?.[currentQuestionIndex]
                              ?.message || '';
                          const isCorrect = feedbackMessage === 'Correct Answer';
                          const maxAttemptsReached = currentAttempts >= 2 || isCorrect;

                          return (
                            <div
                              className="option-item"
                              key={option.key}
                              onMouseEnter={() => setHoveredOption(option.key)}
                              onMouseLeave={() => setHoveredOption(null)}
                            >
                              <label className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`question-${currentCaseStudyIndex}-${currentQuestionIndex}`}
                                  value={option.key}
                                  onChange={(e) =>
                                    handleAnswerChange(
                                      currentCaseStudyIndex,
                                      currentQuestionIndex,
                                      e.target.value
                                    )
                                  }
                                  disabled={maxAttemptsReached}
                                  checked={
                                    selectedAnswers[currentCaseStudyIndex]?.[currentQuestionIndex] ===
                                    option.key
                                  }
                                  className="form-radio h-4 w-4 text-blue-600"
                                />
                                <span className="text-gray-700">
                                  <strong>{`${option.key}.`}</strong> {option.label}
                                </span>
                                {hoveredOption === option.key && (
                                  <span className="ml-2 text-gray-500 whitespace-pre-wrap">
                                    {definitionsMap[option.key] || ''}
                                  </span>
                                )}
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {feedbackMessages[currentCaseStudyIndex]?.[currentQuestionIndex] && (
                      <div className="feedback-section mt-4">
                        <div
                          className={`feedback-message p-3 rounded-md ${
                            feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                              .message === 'Correct Answer'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {
                            feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                              .message
                          }
                        </div>
                        {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].hint && (
                          <div className="hint mt-2 flex items-start space-x-2">
                            <span className="icon-hint mt-1 text-blue-600"></span>
                            <span className="text-gray-700">
                              <strong>Hint:</strong>{' '}
                              {
                                feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                                  .hint
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-questions text-gray-700 mt-4">
                    No questions available for this case study.
                  </p>
                )}
              </div>
            </div>
          )}

          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length === 0 && (
            <div className="no-case-studies text-center text-gray-700 py-6">
              No case studies available at the moment. Please try again later.
            </div>
          )}
        </div>

        <footer className="footer bg-gray-800 text-white text-center py-4">
          <p>© 2024 CoachCare.ai | Contact: operations@coachcare.ai</p>
        </footer>

        {isCertificateOpen && (
          <CertificatePopup
            isOpen={isCertificateOpen}
            onClose={() => setIsCertificateOpen(false)}
            fullName={fullName}
            date={new Date().toLocaleDateString()}
            onPrint={handlePrintCertificate}
          />
        )}
      </div>
    </>
  );
}
