"use client";

import React, { useState, useEffect, useRef } from 'react';

import Script from 'next/script';
import Head from 'next/head';

// Import Firestore functions
import {
  collection,
  addDoc,
  writeBatch,
  getDocs,
  query,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { firestore } from 'src/app/firebase'; // Adjusted import path to match your project structure

// Import jsPDF for PDF generation
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [userType, setUserType] = useState(''); // New state variable for user type
  const [showCaseStudies, setShowCaseStudies] = useState(false);
  const [showSafetyStatement, setShowSafetyStatement] = useState(true);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  // New state variable to control the visibility of Google Translate menu
  const [showTranslate, setShowTranslate] = useState(true);

  // Audio-related states
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState('');

  const audioRef = useRef(null);

  // State to track current question within a case study
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // New state variables for feedback messages and attempts
  const [feedbackMessages, setFeedbackMessages] = useState({});
  const [attempts, setAttempts] = useState({});

  // *** New state variables for score and result details ***
  const [totalScore, setTotalScore] = useState(0);
  const [resultDetails, setResultDetails] = useState([]);

  // *** New state variables for unanswered questions ***
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsAudioPlaying(false);
    } else {
      // Generate new speech URL for the current case study
      const url = await generateSpeech();
      if (url && audioRef.current) {
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

  // Function to save user inputs to Firestore
  const saveUserInputs = async () => {
    try {
      await addDoc(collection(firestore, 'user_profile'), {
        userType,
        department,
        role,
        specialization,
      });
      console.log('User inputs saved successfully.');
    } catch (error) {
      console.error('Error saving user inputs:', error.message);
      setError('Failed to save your inputs. Please try again.');
      throw error; // Propagate error to handleSubmitFinalAssessment
    }
  };

  // Function to save case studies to both collections
  const saveCaseStudies = async () => {
    if (!caseStudies || caseStudies.length === 0) return;

    try {
      // Initialize batch for all_case_studies
      const allCaseStudiesBatch = writeBatch(firestore);
      const allCaseStudiesCollection = collection(firestore, 'all_case_studies');

      caseStudies.forEach((caseStudy) => {
        // Create a new document reference with auto-generated ID for all_case_studies
        const allCaseStudiesDocRef = doc(allCaseStudiesCollection);
        allCaseStudiesBatch.set(allCaseStudiesDocRef, {
          ...caseStudy,
        });
      });

      // Commit both batches
      await Promise.all([allCaseStudiesBatch.commit()]);

      console.log('Case studies saved to both collections successfully.');
    } catch (error) {
      console.error('Error saving case studies:', error.message);
      setError('Failed to save case studies. Please try again.');
      throw error; // Propagate error to handleSubmitFinalAssessment
    }
  };

  const saveAiResponse = async () => {
    if (!aiResponse) return;

    try {
      // Save aiResponse inside an object
      await addDoc(collection(firestore, 'ai_responses'), { aiResponse });
      console.log('AI response saved successfully.');
    } catch (error) {
      console.error('Error saving AI response:', error.message);
      setError('Failed to save AI response. Please try again.');
      throw error;
    }
  };

  // Handle taking the assessment
  const handleTakeAssessment = () => {
    if (!userType) {
      setError('Please select your User Type before proceeding.');
      return;
    }

    if (!role || !department) {
      setError('Please select your Role and Department before proceeding.');
      return;
    }

    if (userType === 'clinical' && !specialization) {
      setError('Please select your Specialization before proceeding.');
      return;
    }

    handleSubmitAssessment();
    // Hide the Google Translate menu after clicking the button
    setShowTranslate(false);
  };

  // Handle submitting the assessment
  const handleSubmitAssessment = async () => {
    setIsLoading(true);
    setError(null);
    try {
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

      // Set both caseStudies and aiResponse
      setCaseStudies(data.caseStudies);
      setAiResponse(data.aiResponse); // New line added

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

  // Modified handleAnswerChange function
  const handleAnswerChange = (caseIndex, questionIndex, selectedOption) => {
    const key = `${caseIndex}-${questionIndex}`;
    const currentAttempts = attempts[key] || 0;

    const previousFeedback = feedbackMessages[caseIndex]?.[questionIndex];

    if (
      currentAttempts >= 3 ||
      (previousFeedback && previousFeedback.message === 'Correct Answer')
    ) {
      // User has reached maximum attempts or already answered correctly
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

    if (selectedOption === correctKey) {
      feedbackMessageNew = 'Correct Answer';
      hintToShow = ''; // No hint needed when correct
    } else {
      const attemptsLeft = 2 - currentAttempts;
      hintToShow = hint; // Show hint on every incorrect attempt
      if (attemptsLeft > 0) {
        feedbackMessageNew = `Incorrect Answer. ${attemptsLeft} tries left.`;
      } else {
        feedbackMessageNew = 'Incorrect Answer. No more tries left!';
      }
    }

    // Update the feedback messages
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

    // Update the attempts
    setAttempts((prevAttempts) => ({
      ...prevAttempts,
      [key]: currentAttempts + 1,
    }));

    // Update the selected answers
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
    setError(null); // Clear error if any
    if (currentCaseStudyIndex > 0) {
      setCurrentCaseStudyIndex(currentCaseStudyIndex - 1);
    }
  };

  // Handle next case study
  const handleNextCaseStudy = () => {
    setError(null); // Clear error if any
    if (currentCaseStudyIndex < caseStudies.length - 1) {
      setCurrentCaseStudyIndex(currentCaseStudyIndex + 1);
    }
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    setError(null); // Clear error if any
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    setError(null); // Clear error if any
    if (
      currentCaseStudy &&
      currentCaseStudy.questions &&
      currentQuestionIndex < currentCaseStudy.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // *** New function to calculate the score ***
  const calculateScore = () => {
    let score = 0;
    let totalQuestions = 0;
    const details = [];

    // Iterate over each case study
    caseStudies.forEach((caseStudy, caseIndex) => {
      const caseDetail = {
        caseStudyNumber: caseIndex + 1,
        questions: [],
      };

      const questions = caseStudy.questions;
      totalQuestions += questions.length;

      questions.forEach((question, questionIndex) => {
        const userAnswer = selectedAnswers[caseIndex]?.[questionIndex];
        const correctAnswer = aiResponse[caseIndex].questions[questionIndex].correctAnswer;
        const correctKey = correctAnswer.split(')')[0].trim(); // e.g., 'C'

        const key = `${caseIndex}-${questionIndex}`;
        const currentAttempts = attempts[key] || 0;
        const feedbackMessage = feedbackMessages[caseIndex]?.[questionIndex];

        let points = 0;
        if (feedbackMessage?.message === 'Correct Answer') {
          points = 1;
          score += 1;
        } else {
          // The user did not get the correct answer within 3 attempts
          points = 0;
        }

        caseDetail.questions.push({
          questionNumber: questionIndex + 1,
          selectedAnswer: userAnswer || 'No Answer',
          correctAnswer: correctKey,
          pointsReceived: points,
        });
      });

      details.push(caseDetail);
    });

    const percentageScore = Math.round((score / totalQuestions) * 100);
    setTotalScore(percentageScore);
    setResultDetails(details);
  };

  // *** New function to check for unanswered questions ***
  const checkUnansweredQuestions = () => {
    const unanswered = [];

    caseStudies.forEach((caseStudy, caseIndex) => {
      caseStudy.questions.forEach((question, questionIndex) => {
        const userAnswer = selectedAnswers[caseIndex]?.[questionIndex];
        if (!userAnswer) {
          unanswered.push({
            caseIndex,
            questionIndex,
            questionText: question.question,
          });
        }
      });
    });

    return unanswered;
  };

  // Handle submitting the final assessment
  const handleSubmitFinalAssessment = () => {
    const unanswered = checkUnansweredQuestions();
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setShowUnansweredModal(true);
    } else {
      proceedWithSubmission();
    }
  };

  // Function to proceed with submission
  const proceedWithSubmission = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await saveUserInputs(); // Save user inputs
      await saveCaseStudies(); // Save case studies to both collections
      setAssessmentComplete(true);
      setShowCaseStudies(false);
      setShowSafetyStatement(false);
      calculateScore(); // *** Calculate the score after assessment completion ***
    } catch (err) {
      setError(err.message || 'An error occurred during submission.');
      console.error('Error during submission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // New handler to navigate back to main page and clear current_session_case_studies
  const handleBackToMainPage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteAllDocumentsInCollection('user_profile');
      await deleteAllDocumentsInCollection('all_case_studies');
      await deleteAllDocumentsInCollection('ai_responses');

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
    } catch (err) {
      setError(err.message || 'Failed to navigate back to the main page.');
      console.error('Error navigating back:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete all documents in a collection
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

  // *** Modified handlePrint function ***
  const handlePrint = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docPDF = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        floatPrecision: 16, // or "smart", default is 16
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Add Title
      docPDF.setFontSize(18);
      docPDF.setFont('helvetica', 'bold');
      docPDF.text('Safety Assessment Report', pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 10;

      // Add Total Score
      docPDF.setFontSize(14);
      docPDF.setFont('helvetica', 'normal');
      docPDF.text(`Total Score: ${totalScore}%`, pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 10;

      // Add a horizontal line
      docPDF.setLineWidth(0.5);
      docPDF.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Iterate through each case study to add details and tables
      resultDetails.forEach((caseDetail, index) => {
        const caseStudy = caseStudies[index];

        // Add Case Study Title
        docPDF.setFontSize(16);
        docPDF.setFont('helvetica', 'bold');
        docPDF.text(`Case Study ${caseDetail.caseStudyNumber}`, margin, yPosition);
        yPosition += 8;

        // Add Scenario
        docPDF.setFontSize(12);
        docPDF.setFont('helvetica', 'normal');
        const splitScenarioText = docPDF.splitTextToSize(
          caseStudy.scenario,
          pageWidth - 2 * margin
        );
        docPDF.text(splitScenarioText, margin, yPosition);
        yPosition += splitScenarioText.length * 6 + 4; // Adjust spacing based on number of lines

        // Iterate through each question to add question text and options
        caseStudy.questions.forEach((question, qIndex) => {
          const questionNumber = qIndex + 1;
          const questionText = question.question;
          const options = question.options; // Assuming options is an array of { key: 'A', label: 'Option1' }

          // Add Question Number and Text
          docPDF.setFontSize(12);
          docPDF.setFont('helvetica', 'bold');
          const questionHeader = `Question ${questionNumber}: ${questionText}`;
          const splitQuestionHeader = docPDF.splitTextToSize(
            questionHeader,
            pageWidth - 2 * margin
          );
          docPDF.text(splitQuestionHeader, margin, yPosition);
          yPosition += splitQuestionHeader.length * 6 + 2;

          // Add Options
          docPDF.setFontSize(11);
          docPDF.setFont('helvetica', 'normal');
          options.forEach((option) => {
            const optionText = `${option.key}. ${option.label}`;
            const splitOptionText = docPDF.splitTextToSize(optionText, pageWidth - 2 * margin);
            docPDF.text(splitOptionText, margin + 5, yPosition);
            yPosition += splitOptionText.length * 5 + 1;
          });

          yPosition += 2; // Add some spacing after options

          // Check if yPosition exceeds page height, add new page if necessary
          if (yPosition > pageHeight - margin - 30) {
            docPDF.addPage();
            yPosition = margin;
          }
        });

        // Prepare Table Data
        const tableColumn = ['Question #', 'User Answer', 'Correct Answer', 'Points Received'];
        const tableRows = caseDetail.questions.map((q) => [
          q.questionNumber.toString(),
          q.selectedAnswer,
          q.correctAnswer,
          q.pointsReceived.toString(),
        ]);

        // Calculate the height required for the table
        const tableOptions = {
          startY: yPosition,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 3 },
          headStyles: { fillColor: [22, 160, 133], halign: 'center' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 }, // Question #
            1: { halign: 'center', cellWidth: 40 }, // User Answer
            2: { halign: 'center', cellWidth: 40 }, // Correct Answer
            3: { halign: 'center', cellWidth: 30 }, // Points Received
          },
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            // Optionally add headers or footers here
          },
        };

        // Add Table using autoTable
        docPDF.autoTable(tableOptions);
        yPosition = docPDF.lastAutoTable.finalY + 10; // Update yPosition after table

        // Check if the next content exceeds the page height
        if (yPosition > pageHeight - margin) {
          docPDF.addPage();
          yPosition = margin;
        }

        // Optionally, add spacing or other content between case studies
        if (index < resultDetails.length - 1) {
          docPDF.addPage();
          yPosition = margin;
        }
      });

      // Optionally, add a summary or additional notes here

      // Save the PDF
      docPDF.save('coachcare_ai_safety_assessment.pdf');
    } catch (err) {
      setError(err.message || 'Failed to generate PDF.');
      console.error('Error generating PDF:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // *** New function to handle page refresh ***
  const handlePageRefresh = async () => {
    try {
      await deleteAllDocumentsInCollection('user_profile');
      await deleteAllDocumentsInCollection('all_case_studies');
      await deleteAllDocumentsInCollection('ai_responses');

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
    } catch (err) {
      console.error('Error during page refresh cleanup:', err);
    }
  };

  // *** useEffect to detect page refresh and perform cleanup ***
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0 && navigationEntries[0].type === 'reload') {
        // The page was reloaded
        handlePageRefresh();
      }
    }
  }, []);

  // Current Case Study
  const currentCaseStudy = caseStudies[currentCaseStudyIndex];

  // Example options for dropdowns based on userType
  const clinicalDepartments = [
    'Operating Room',
  ];

  const nonClinicalDepartments = [
    'Communication',
    // Add other non-clinical departments if needed
  ];

  const clinicalRoles = [
    'Surgeon',
    'Nurse',
    'Circulator Nurse',
    'Surgical Technologist',
    // Add other clinical roles if needed
  ];

  const nonClinicalRoles = [
    'Administrator',
    'Accountant',
    'HR Manager',
    'Maintenance Staff',
    'IT Support',
    // Add other non-clinical roles if needed
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
    // Add other specializations if needed
  ];

  // Determine which departments and roles to use based on userType
  let departmentsToUse = [];
  let rolesToUse = [];

  if (userType === 'clinical') {
    departmentsToUse = clinicalDepartments;
    rolesToUse = clinicalRoles;
  } else if (userType === 'non-clinical') {
    departmentsToUse = nonClinicalDepartments;
    rolesToUse = nonClinicalRoles;
  }

  // Google Translate Initialization
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en', // Set the base language to English
          autoDisplay: false, // Prevent automatic translation based on browser settings
          includedLanguages: 'en,es', // Only include English and Spanish
        },
        'google_translate_element'
      );

      // Force the language to English after initialization
      setTimeout(() => {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
          select.value = 'en';
          select.dispatchEvent(new Event('change'));
        }
      }, 1000); // Delay to ensure the translate element has loaded
    };
  }, []);

  return (
    <>
      {/* Head section to include Google Translate CSS */}
      <Head>
        {/* Google Translate CSS */}
        <link
          rel="stylesheet"
          type="text/css"
          href="https://www.gstatic.com/_/translate_http/_/ss/k=translate_http.tr.26tY-h6gH9w.L.W.O/am=CAM/d=0/rs=AN8SPfpIXxhebB2A47D9J-MACsXmFF6Vew/m=el_main_css"
        />
      </Head>
  
      {/* Google Translate Script */}
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive" // Ensures the script loads after the page is interactive
      />
  
      <div className="container">
        <div className="content-wrapper">
          {/* Safety Statement */}
          {showSafetyStatement && (
            <h2 className="safety-statement">
              Avoidable medical errors in hospitals are the third leading cause of
              death in the USA. 99% of avoidable medical errors can be traced back to the
              misuse or lack of use of the 4 safety principles and corresponding 11
              error prevention tools (EPTs). By understanding and using this safety
              language, harm to patients can be drastically reduced.
            </h2>
          )}
  
          {/* Enhanced Form Container */}
          {showSafetyStatement && (
            <div className="form-container">
              <div className="form-grid">
                {/* User Type Select */}
                <div className="form-item">
                  <label htmlFor="user-type-select">User Type</label>
                  <select
                    id="user-type-select"
                    value={userType}
                    onChange={(e) => {
                      setUserType(e.target.value);
                      setDepartment(''); // Reset department
                      setRole(''); // Reset role
                      setSpecialization(''); // Reset specialization
                      if (error) setError(''); // Clear error if any
                    }}
                  >
                    <option value="">Select</option>
                    <option value="clinical">Clinical</option>
                    <option value="non-clinical">Non-Clinical</option>
                  </select>
                </div>
                {/* Department Select */}
                <div className="form-item">
                  <label htmlFor="department-select">Department</label>
                  <select
                    id="department-select"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (error) setError(''); // Clear error if any
                    }}
                    disabled={!userType}
                  >
                    <option value="">Select Department</option>
                    {departmentsToUse.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Role Select */}
                <div className="form-item">
                  <label htmlFor="role-select">Role</label>
                  <select
                    id="role-select"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      if (error) setError(''); // Clear error if any
                    }}
                    disabled={!userType}
                  >
                    <option value="">Select Role</option>
                    {rolesToUse.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Specialization Select - only show if userType is 'clinical' */}
                {userType === 'clinical' && (
                  <div className="form-item">
                    <label htmlFor="specialization-select">Specialization</label>
                    <select
                      id="specialization-select"
                      value={specialization}
                      onChange={(e) => {
                        setSpecialization(e.target.value);
                        if (error) setError(''); // Clear error if any
                      }}
                    >
                      <option value="">None</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
  
          {/* Google Translate Element */}
          {showTranslate && (
            <div id="google_translate_element" className="google-translate-element"></div>
          )}
  
          {/* Take Assessment Button */}
          <div className="button-container">
            {showSafetyStatement && !showCaseStudies && !assessmentComplete && (
              <button
                type="button"
                className="assessment-button"
                onClick={handleTakeAssessment}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Starting your assessment, please wait...'
                  : 'Take Assessment'}
              </button>
            )}
          </div>
  
          {/* Error Alert */}
          {error && (
            <div className="error-alert">
              {error}
            </div>
          )}
  
          {/* Case Studies Page */}
          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length > 0 && (
            <div className="case-studies">
              {/* Current Case Study */}
              <div className="case-study" key={currentCaseStudyIndex}>
                {/* Case Study Image */}
                {caseStudies[currentCaseStudyIndex].imageUrl && (
                  <div className="case-study-image">
                    <img
                      src={caseStudies[currentCaseStudyIndex].imageUrl}
                      alt={`Case Study ${currentCaseStudyIndex + 1} Image`}
                    />
                  </div>
                )}
  
                {/* Case Study Title and Audio Button */}
                <div className="case-study-header">
                  <h3>{`Case Study ${currentCaseStudyIndex + 1}`}</h3>
                  <button
                    type="button"
                    className="audio-button"
                    onClick={fetchAudio}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <span>Loading...</span>
                    ) : isAudioPlaying ? (
                      <>
                        <span className="icon-volume-up"></span>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <span className="icon-volume-off"></span>
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                </div>
  
                {/* Audio Element */}
                <audio ref={audioRef} />
  
                {/* Audio Error Alert */}
                {audioError && (
                  <div className="audio-error">
                    {audioError}
                  </div>
                )}
  
                {/* Case Study Scenario */}
                <p className="case-study-scenario">
                  {caseStudies[currentCaseStudyIndex].scenario}
                </p>
  
                {/* Case Study Questions */}
                {caseStudies[currentCaseStudyIndex].questions && caseStudies[currentCaseStudyIndex].questions.length > 0 ? (
                  <div className="question-section">
                    {/* Header for the Question */}
                    <h4 className="question-header">
                      {`Question ${currentQuestionIndex + 1}: ${caseStudies[currentCaseStudyIndex].questions[currentQuestionIndex].question}`}
                    </h4>
  
                    <div className="options-group">
                      {caseStudies[currentCaseStudyIndex].questions[currentQuestionIndex].options.map(
                        (option) => {
                          const key = `${currentCaseStudyIndex}-${currentQuestionIndex}`;
                          const currentAttempts = attempts[key] || 0;
                          const feedbackMessage =
                            feedbackMessages[currentCaseStudyIndex]?.[currentQuestionIndex]
                              ?.message || '';
                          const isCorrect = feedbackMessage === 'Correct Answer';
                          const maxAttemptsReached = currentAttempts >= 3 || isCorrect;
  
                          return (
                            <div className="option-item" key={option.key}>
                              <label>
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
                                    selectedAnswers[currentCaseStudyIndex]?.[currentQuestionIndex] === option.key
                                  }
                                />
                                <span>
                                  <strong>{option.key}.</strong> {option.label}
                                </span>
                              </label>
                            </div>
                          );
                        }
                      )}
                    </div>
  
                    {/* Display feedback message */}
                    {feedbackMessages[currentCaseStudyIndex]?.[currentQuestionIndex] && (
                      <div className="feedback-section">
                        <div
                          className={`feedback-message ${
                            feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].message === 'Correct Answer'
                              ? 'success'
                              : 'info'
                          }`}
                        >
                          {
                            feedbackMessages[currentCaseStudyIndex][currentQuestionIndex]
                              .message
                          }
                        </div>
                        {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].hint && (
                          <div className="hint">
                            <span className="icon-hint"></span>
                            <span>
                              <strong>Hint:</strong>{' '}
                              {feedbackMessages[currentCaseStudyIndex][currentQuestionIndex].hint}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-questions">
                    No questions available for this case study.
                  </p>
                )}
  
                {/* Navigation Buttons */}
                {caseStudies[currentCaseStudyIndex].questions && caseStudies[currentCaseStudyIndex].questions.length > 0 && (
                  <div className="navigation-buttons">
                    <div className="nav-group">
                      {/* Previous Question Button */}
                      <button
                        type="button"
                        className="nav-button"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous Question
                      </button>
                      {/* Next Question Button */}
                      {caseStudies[currentCaseStudyIndex].questions.length > 1 && (
                        <button
                          type="button"
                          className="nav-button"
                          onClick={handleNextQuestion}
                          disabled={
                            currentQuestionIndex ===
                            caseStudies[currentCaseStudyIndex].questions.length - 1
                          }
                        >
                          Next Question
                        </button>
                      )}
                    </div>
                    <div className="nav-group">
                      {/* Previous Case Study Button */}
                      <button
                        type="button"
                        className="nav-button"
                        onClick={handlePreviousCaseStudy}
                        disabled={currentCaseStudyIndex === 0}
                      >
                        Previous Case Study
                      </button>
                      {/* Next/Submit Case Study Button */}
                      {currentCaseStudyIndex === caseStudies.length - 1 ? (
                        <button
                          type="button"
                          className="submit-button"
                          onClick={handleSubmitFinalAssessment}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Submitting...' : 'Submit'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="nav-button"
                          onClick={handleNextCaseStudy}
                        >
                          Next Case Study
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
  
          {/* Assessment Completion Form */}
          {assessmentComplete && (
            <div className="assessment-complete">
              <div className="result-container">
                {/* Score Circle */}
                <div className="score-circle">
                  <span>{`${totalScore}%`}</span>
                </div>
  
                {/* Detailed Results */}
                {resultDetails.map((caseDetail) => (
                  <div key={`case-${caseDetail.caseStudyNumber}`} className="case-detail">
                    <h4>{`Case Study ${caseDetail.caseStudyNumber}`}</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Question #</th>
                          <th>Selected Answer</th>
                          <th>Correct Answer</th>
                          <th>Points Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseDetail.questions.map((questionDetail) => (
                          <tr key={`question-${questionDetail.questionNumber}`}>
                            <td>{questionDetail.questionNumber}</td>
                            <td>{questionDetail.selectedAnswer}</td>
                            <td>{questionDetail.correctAnswer}</td>
                            <td>{questionDetail.pointsReceived}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
  
                <div className="result-buttons">
                  <button
                    type="button"
                    className="main-button"
                    onClick={handleBackToMainPage}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Return to Main'}
                  </button>
                  <button
                    type="button"
                    className="print-button"
                    onClick={handlePrint}
                  >
                    <span className="icon-print"></span>
                    Print Assessment Report
                  </button>
                </div>
              </div>
            </div>
          )}
  
          {/* Handle Empty Case Studies */}
          {showCaseStudies && Array.isArray(caseStudies) && caseStudies.length === 0 && (
            <div className="no-case-studies">
              No case studies available at the moment. Please try again later.
            </div>
          )}
  
          {/* Modal for Unanswered Questions */}
          {showUnansweredModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>You have not selected an option for the following questions:</h3>
                <ul>
                  {unansweredQuestions.map((item, index) => (
                    <li key={index}>
                      {`Case Study ${item.caseIndex + 1}, Question ${item.questionIndex + 1}: ${item.questionText}`}
                    </li>
                  ))}
                </ul>
                <div className="modal-buttons">
                  <button
                    className="modal-button"
                    onClick={() => setShowUnansweredModal(false)}
                  >
                    Return
                  </button>
                  <button
                    className="modal-button"
                    onClick={() => {
                      setShowUnansweredModal(false);
                      proceedWithSubmission();
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
  
        {/* Footer */}
        <footer className="footer">
          <p>© CoachCare.ai | Email: rizwanshaikh2200@gmail.com | Phone: (404) 980-4465</p>
        </footer>
      </div>
  
      <style jsx>{`
        .footer {
          text-align: center;
          padding: 1rem;
          font-size: 0.9rem;
          color: #777;
          border-top: 1px solid #eaeaea;
          margin-top: 2rem;
        }
      `}</style>
    </>
  );
}  
