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
          "certificate-container border-0 rounded-3xl shadow-2xl p-0 bg-white max-w-3xl w-full overflow-hidden",
        sx: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          margin: 0,
        },
      }}
      BackdropProps={{
        className: "bg-black/70",
        sx: { backdropFilter: "blur(8px)" },
      }}
    >
      <div className="certificate-popup">
        {/* Decorative Elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-30" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-green-100 rounded-full opacity-30" />
        
        {/* Popup Header */}
        <div className="text-center py-8 relative">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500" />
          <div className="relative z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-28 bg-yellow-100 rounded-full opacity-50 blur-xl" />
            <Trophy className="relative w-16 h-16 text-yellow-600 mx-auto mb-4 drop-shadow-lg" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-700 via-green-600 to-blue-700 bg-clip-text text-transparent mb-2 font-serif tracking-wide">
            Congratulations!
          </h2>
        </div>

        {/* Certificate Content */}
        <div
          id="certificate"
          className="certificate-content mx-8 my-6 border-[3px] border-double border-gray-300 p-10 rounded-xl shadow-lg relative bg-gray-50"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000),linear-gradient(45deg,#000_25%,transparent_25%,transparent_75%,#000_75%,#000)] bg-[length:60px_60px] bg-[position:0_0,30px_30px]" />
          </div>
          
          {/* Gold Seal */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full opacity-70 shadow-lg"></div>
            <div className="absolute inset-2 border-2 border-dashed border-yellow-100 rounded-full"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-yellow-100 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div className="text-center mb-6 relative">
            <img
              src="/Picture1.jpg"
              alt="CoachCare.ai Logo"
              className="mx-auto h-24 mb-2 drop-shadow-md"
            />
          </div>
          
          <div className="text-center space-y-6 relative">
            <h2 className="text-3xl font-semibold text-gray-800 font-serif tracking-wider">
              Certificate of Completion
            </h2>
            <p className="text-xl text-gray-600 italic">
              This certificate is proudly presented to
            </p>
            <p className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent my-3 font-serif tracking-wider py-2">
              {fullName}
            </p>
            <p className="text-xl leading-relaxed text-gray-700">
              For successfully completing the{" "}
              <span className="font-semibold text-blue-700">
                Patient Safety Language Basics
              </span>{" "}
              module.
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-600">
                Issued on: <span className="font-semibold">{date}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex justify-center gap-6 pt-4 pb-8">
          <button
            onClick={onPrint}
            className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all group-hover:opacity-0"></span>
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 transition-all group-hover:opacity-100"></span>
            <span className="relative z-10 flex items-center justify-center gap-3">
              <svg
                className="w-5 h-5 transition-transform group-hover:rotate-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z"
                />
              </svg>
              Print Certificate
            </span>
          </button>
          <button
            onClick={onClose}
            className="group px-8 py-3 bg-white text-gray-700 rounded-xl font-semibold shadow-md border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg"
          >
            <span className="flex items-center justify-center gap-3">
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-1"
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
      'Physician': [
        'Neurology'
      ],
      'Nurse Practitioner': [
        'Neurology'
      ],
      
      'Registered Nurse': [
        'Neurology'
      ],

       'Medical Assistance': [
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
      <meta name="description" content="AI Personalized Healthcare Safety Training Module" />
    </Head>
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Modern App Bar with depth */}
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-700 to-blue-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-white font-bold text-lg">
                  <span className="hidden sm:block">
                    AI Personalized Healthcare Safety Module
                  </span>
                  <span className="block sm:hidden">CoachCare.ai</span>
                </div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden ml-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-gray-200 focus:outline-none transition-colors duration-200 flex items-center"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:items-center sm:space-x-1">
              <Link
                href="/Home"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/components"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
              >
                Safety Module
              </Link>
              <Link
                href="/dashboard"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
              >
                Dashboard
              </Link>
              <Link
                href="/feedback"
                className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
              >
                Feedback
              </Link>
            </div>
          </div>

          {/* Mobile Navigation - Enhanced with animation */}
          {isMobileMenuOpen && (
            <div className="sm:hidden pb-4 pt-2 border-t border-blue-600">
              <div className="flex flex-col space-y-1">
                <Link
                  href="/"
                  className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  href="/components"
                  className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Safety Module
                </Link>
                <Link
                  href="/dashboard"
                  className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/feedback"
                  className="text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Feedback
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Safety Statement with better formatting */}
          {showSafetyStatement && (
            <div className="mb-8 bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
              <p className="text-gray-700 leading-relaxed">
                <span className="font-semibold text-blue-700 block mb-2 text-lg">Why This Matters:</span>
                Avoidable medical error is a leading cause of death in the USA. Something as simple as
                using safety behaviors has been proven to decrease harm to patients. The scenarios generated
                below are from real case studies that have been published in the literature and are customized
                just for you in order to make the safety behavior more relevant. 
                <span className="mt-2 block font-medium text-blue-600">Thank you for doing your part to put more care into healthcare.</span>
              </p>
            </div>
          )}

          {/* Assessment Complete Section with enhanced design */}
          {assessmentComplete && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Assessment Results</h2>
              </div>
              
              <div className="p-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  {/* Score Card */}
                  <div className="bg-blue-50 rounded-xl p-6 text-center flex-shrink-0 w-full md:w-64">
                    <div className="score-circle relative w-32 h-32 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full bg-blue-100"></div>
                      <div 
                        className={`absolute inset-0 rounded-full transition-all duration-500 ease-in-out
                        ${totalScore >= 90 ? 'bg-green-500' : 
                          totalScore >= 70 ? 'bg-blue-500' : 'bg-red-500'}`}
                        style={{
                          clipPath: `polygon(50% 50%, 50% 0%, ${
                            50 + 50 * Math.sin(((totalScore / 100) * 360 * Math.PI) / 180)
                          }% ${
                            50 - 50 * Math.cos(((totalScore / 100) * 360 * Math.PI) / 180)
                          }%, ${totalScore > 25 ? '0% 0%, 0% 100%, 100% 100%' : ''})` 
                        }}
                      >
                      </div>
                      <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                        <span className="text-3xl font-bold">{totalScore}%</span>
                      </div>
                    </div>
                    
                    <div className="text-lg font-medium text-gray-700">
                      {correctCount} out of 12 correct
                    </div>
                    
                    <div 
                      className={`mt-4 py-2 px-4 rounded-full font-bold text-white ${
                        totalScore >= 70 ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {totalScore >= 70 ? 'PASS' : 'NEEDS REVIEW'}
                    </div>
                  </div>
                  
                  {/* Result Summary */}
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Performance Summary</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resultDetails.slice(0, 2).map((caseDetail) => (
                        <div key={`summary-${caseDetail.caseStudyNumber}`} className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-700 mb-2">{`Case Study ${caseDetail.caseStudyNumber}`}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              {caseDetail.questions.filter(q => q.isCorrect).length}/{caseDetail.questions.length}
                            </div>
                            <div className="text-sm text-gray-600">questions answered correctly</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                      <button
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                        onClick={handlePrint}
                        disabled={isLoading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                        </svg>
                        Print Report
                      </button>
                      
                      {totalScore >= 70 && (
                        <button
                          className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                          onClick={() => setIsCertificateOpen(true)}
                          disabled={isLoading}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          View Certificate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Results with collapsible sections */}
          {assessmentComplete && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Detailed Results</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {resultDetails.map((caseDetail) => (
                  <details key={`case-${caseDetail.caseStudyNumber}`} className="group">
                    <summary className="p-6 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          caseDetail.questions.filter(q => q.isCorrect).length === caseDetail.questions.length 
                            ? 'bg-green-600' : 'bg-blue-600'
                        }`}>
                          {caseDetail.questions.filter(q => q.isCorrect).length}/{caseDetail.questions.length}
                        </div>
                        <h3 className="text-lg font-semibold">{`Case Study ${caseDetail.caseStudyNumber}`}</h3>
                      </div>
                      <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    
                    <div className="px-6 pb-6">
                      <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <p className="text-gray-700">{caseDetail.caseStudyText}</p>
                      </div>
                      
                      <div className="space-y-6">
                        {caseDetail.questions.map((q) => (
                          <div key={`question-${q.questionNumber}`} className={`p-4 rounded-lg border ${
                            q.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                          }`}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`text-xl ${q.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {q.isCorrect ? '✓' : '✗'}
                              </span>
                              <h4 className="text-lg font-medium">{`Question ${q.questionNumber}`}</h4>
                            </div>
                            
                            <p className="mb-4">{q.questionText}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded-md">
                                <h5 className="font-semibold text-sm text-gray-500 mb-1">Your Answer:</h5>
                                <p className={`${q.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                  {q.selectedAnswer !== 'No Answer'
                                    ? getOptionLabel(
                                        caseDetail.caseStudyNumber - 1,
                                        q.questionNumber - 1,
                                        q.selectedAnswer
                                      )
                                    : 'No Answer'}
                                </p>
                              </div>
                              
                              <div className="bg-white p-3 rounded-md">
                                <h5 className="font-semibold text-sm text-gray-500 mb-1">Correct Answer:</h5>
                                <p className="text-green-700">
                                  {getOptionLabel(
                                    caseDetail.caseStudyNumber - 1,
                                    q.questionNumber - 1,
                                    aiResponse[caseDetail.caseStudyNumber - 1].questions[
                                      q.questionNumber - 1
                                    ].correctAnswer.split(')')[0].trim()
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Form Container with modern card design */}
          {showSafetyStatement && (
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">Professional Information</h2>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-item">
                      <label htmlFor="department-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <div className="relative">
                        <select
                          id="department-select"
                          value={department}
                          onChange={(e) => {
                            setDepartment(e.target.value);
                            if (error) setError('');
                          }}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 pl-3 pr-10 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <option value="">Select Department</option>
                          {departmentsToUse.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="form-item">
                      <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <div className="relative">
                        <select
                          id="role-select"
                          value={role}
                          onChange={(e) => {
                            setRole(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={!department}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 pl-3 pr-10 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Role</option>
                          {rolesToUse.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="form-item">
                      <label htmlFor="specialization-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Specialization
                      </label>
                      <div className="relative">
                        <select
                          id="specialization-select"
                          value={specialization}
                          onChange={(e) => {
                            setSpecialization(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={!role}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 pl-3 pr-10 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Specialization</option>
                          {specializationsToUse.map((spec) => (
                            <option key={spec} value={spec}>
                              {spec}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="form-item">
                      <label htmlFor="care-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Care Delivery Setting
                      </label>
                      <div className="relative">
                        <select
                          id="care-select"
                          value={care}
                          onChange={(e) => {
                            setCare(e.target.value);
                            if (error) setError('');
                          }}
                          className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 pl-3 pr-10 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                          <option value="">Select Care Delivery Setting</option>
                          <option value="Inpatient">Inpatient</option>
                          <option value="Outpatient">Outpatient</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                {showSafetyStatement && !showCaseStudies && !assessmentComplete && (
                  <>
                    <button
                      type="button"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md"
                      onClick={handleTakeAssessment}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Starting your assessment...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Generate My Personalized Training Scenarios
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-blue-600 border border-blue-300 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 shadow-sm"
                      onClick={handlePrintCaseStudiesAndQuestions}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Preparing PDF...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Print Case Studies and Questions
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Case Studies with enhanced card design */}
          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length > 0 && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">{`Case Study ${currentCaseStudyIndex + 1}`}</h2>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isAudioLoading ? 'bg-gray-200 text-gray-600 cursor-wait' : 
                          isAudioPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white text-blue-700 hover:bg-blue-50'}`}
                      onClick={fetchAudio}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading
                        </>
                      ) : isAudioPlaying ? (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414-7.072m-2.828 9.9a9 9 0 010-12.728" />
                          </svg>
                          Listen
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {aiResponse[currentCaseStudyIndex].imageUrl && (
                  <div className="mb-6">
                    <img
                      src={aiResponse[currentCaseStudyIndex].imageUrl}
                      alt={`Case Study ${currentCaseStudyIndex + 1} Illustration`}
                      className="max-w-sm mx-auto h-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                <audio ref={audioRef} className="hidden" />
                
                {audioError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{audioError}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 p-6 rounded-lg mb-8 border border-blue-100">
                  <p className="text-gray-700 leading-relaxed">
                    {caseStudies[currentCaseStudyIndex].scenario}
                  </p>
                </div>

                {caseStudies[currentCaseStudyIndex].questions &&
                caseStudies[currentCaseStudyIndex].questions.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {`Question ${currentQuestionIndex + 1}: ${
                        caseStudies[currentCaseStudyIndex].questions[currentQuestionIndex].question
                      }`}
                    </h4>

                    <div className="space-y-3 mt-6">
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
                              className={`option-item relative p-4 rounded-lg border-2 transition-all duration-200 ${
                                selectedAnswers[currentCaseStudyIndex]?.[currentQuestionIndex] === option.key
                                  ? maxAttemptsReached && isCorrect
                                    ? 'border-green-400 bg-green-50'
                                    : maxAttemptsReached && !isCorrect
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-blue-400 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                              key={option.key}
                              onMouseEnter={() => setHoveredOption(option.key)}
                              onMouseLeave={() => setHoveredOption(null)}
                            >
                              <label className="flex items-start cursor-pointer">
                                <div className="flex items-center h-5">
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
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                  />
                                </div>
                                <div className="ml-3 text-sm">
                                  <span className="font-medium text-gray-800">{`${option.key}.`}</span>{" "}
                                  <span className="text-gray-700">{option.label}</span>
                                </div>
                              </label>
                              
                              {hoveredOption === option.key && definitionsMap[option.key] && (
                                <div className="absolute z-10 left-full ml-4 top-0 w-64 bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3 transition-opacity duration-150">
                                  <div className="absolute left-0 top-4 -ml-2 w-0 h-0 border-t-4 border-r-4 border-b-4 border-t-transparent border-r-gray-800 border-b-transparent"></div>
                                  {definitionsMap[option.key]}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>

                    {feedbackMessages[currentCaseStudyIndex]?.[currentQuestionIndex] && (
                      <div className="mt-6">
                        <div
                          className={`p-4 rounded-lg flex items-start ${
                            feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                              .message === 'Correct Answer'
                              ? 'bg-green-50 border-l-4 border-green-400'
                              : 'bg-blue-50 border-l-4 border-blue-400'
                          }`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].message === 'Correct Answer' ? (
                              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3">
                            <h3 className={`text-md font-medium ${
                              feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                                .message === 'Correct Answer' ? 'text-green-800' : 'text-blue-800'
                            }`}>
                              {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].message}
                            </h3>
                            {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].hint && (
                              <div className="mt-2 text-sm text-gray-700">
                                <p><strong>Hint:</strong> {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].hint}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Removed the Next/Previous Question buttons as requested */}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No questions available</h3>
                    <p className="mt-1 text-sm text-gray-500">No questions are available for this case study.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length === 0 && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No case studies available</h3>
              <p className="mt-1 text-gray-500">No case studies are available at the moment. Please try again later.</p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                  onClick={() => {}}
                >
                  Return to Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </main>


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
