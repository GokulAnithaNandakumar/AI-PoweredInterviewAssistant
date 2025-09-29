import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import './CandidateInterviewPage.css';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Timer as TimerIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

interface CandidateInfo {
  name?: string;
  email?: string;
  phone?: string;
  experience?: string;
  skills?: string[];
  education?: string;
  projects?: string;
}

interface Question {
  id?: number;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number;
  category: string;
  question_number: number;
}

interface ChatMessage {
  type: 'system' | 'user' | 'question' | 'timer' | 'completed';
  content: string;
  timestamp: Date;
  questionData?: Question;
  isCurrentQuestion?: boolean;
}

interface InterviewState {
  phase: 'upload' | 'missing-info' | 'interview' | 'completed';
  currentQuestionIndex: number;
  answers: string[];
  timeRemaining: number;
  totalScore?: number;
  summary?: {
    overall_score: number;
    recommendation: string;
    [key: string]: string | number;
  };
}

interface SessionInfo {
  position_title: string;
  candidate_email: string;
  status: string;
  created_at: string;
}

interface ContinueStatus {
  can_continue: boolean;
  has_progress: boolean;
  retry_count: number;
  max_retries: number;
  total_questions: number;
  answered_questions: number;
  resume_uploaded: boolean;
  next_question_index: number;
  session_status: string;
  reason?: string;
  candidate_info: {
    name: string;
    email: string;
    phone: string;
  };
}

interface ContinueResponse {
  success: boolean;
  message: string;
  retry_count: number;
  questions: Question[];
  existing_answers: Array<{
    question_id: number;
    answer_text: string;
    time_taken: number;
    score: number;
  }>;
  next_question_index: number;
  candidate_info: {
    name: string;
    email: string;
    phone: string;
  };
}

const TOTAL_QUESTIONS = 6; // Interview always has 6 questions

const CandidateInterviewPage: React.FC = () => {

  // --- Continue Interview Button Timeout ---
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [canClickContinue, setCanClickContinue] = useState(false);
  const [continueCountdown, setContinueCountdown] = useState(20);

  useEffect(() => {
    if (showContinueDialog) {
      setCanClickContinue(false);
      setContinueCountdown(20);
      const interval = setInterval(() => {
        setContinueCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanClickContinue(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanClickContinue(false);
      setContinueCountdown(20);
    }
  }, [showContinueDialog]);
  const { sessionToken } = useParams<{ sessionToken: string }>();


  // ...existing code...

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [continueStatus, setContinueStatus] = useState<ContinueStatus | null>(null);

  // If can_continue is false, show interview completed state (do not navigate away)
  useEffect(() => {
    const handleMaxRetry = async () => {
      // Call backend to force score/summary generation
      try {
        const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          setInterviewState(prev => ({
            ...prev,
            phase: 'completed',
            totalScore: data.total_score,
            summary: data.summary
          }));
          setChatMessages(prev => [
            ...prev,
            {
              type: 'completed',
              content: "Interview completed! You have reached the maximum number of retry attempts. Your responses have been recorded and the interviewer will review them shortly.",
              timestamp: new Date()
            }
          ]);
        } else {
          setInterviewState(prev => ({ ...prev, phase: 'completed' }));
          setChatMessages(prev => [
            ...prev,
            {
              type: 'completed',
              content: "Interview completed! You have reached the maximum number of retry attempts. Your responses have been recorded and the interviewer will review them shortly.",
              timestamp: new Date()
            }
          ]);
        }
      } catch {
        setInterviewState(prev => ({ ...prev, phase: 'completed' }));
        setChatMessages(prev => [
          ...prev,
          {
            type: 'completed',
            content: "Interview completed! You have reached the maximum number of retry attempts. Your responses have been recorded and the interviewer will review them shortly.",
            timestamp: new Date()
          }
        ]);
      }
      localStorage.removeItem(`interview_${sessionToken}`);
    };
    if (continueStatus && continueStatus.can_continue === false) {
      if (continueStatus.reason === 'Maximum retry attempts reached') {
        handleMaxRetry();
      } else {
        setInterviewState(prev => ({ ...prev, phase: 'completed' }));
        setChatMessages(prev => [
          ...prev,
          {
            type: 'completed',
            content: "Interview completed! Thank you for your time. Your responses have been recorded and the interviewer will review them shortly.",
            timestamp: new Date()
          }
        ]);
        localStorage.removeItem(`interview_${sessionToken}`);
      }
    }
  }, [continueStatus, sessionToken]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Interview state management
  const [interviewState, setInterviewState] = useState<InterviewState>(() => {
    // For debugging - clear localStorage to start fresh (uncomment if needed)
    localStorage.removeItem(`interview_${sessionToken}`);

    // Load from localStorage if available
    const saved = localStorage.getItem(`interview_${sessionToken}`);
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        console.log('Loaded state from localStorage:', parsedState);
        return parsedState;
      } catch (error) {
        console.log('Failed to parse saved state, starting fresh', error);
        localStorage.removeItem(`interview_${sessionToken}`);
      }
    }
    console.log('Starting with fresh state - upload phase');
    return {
      phase: 'upload',
      currentQuestionIndex: 0,
      answers: [],
      timeRemaining: 0
    };
  });

  // Resume upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Interview loading states
  const [startingInterview, setStartingInterview] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Chat interface
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);

  // Timer management
  const timerRef = useRef<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persistence - save state to localStorage
  const saveState = useCallback(() => {
    localStorage.setItem(`interview_${sessionToken}`, JSON.stringify(interviewState));
  }, [sessionToken, interviewState]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Function to save chat message to backend
  const saveChatMessageToBackend = useCallback(async (message: ChatMessage) => {
    try {
      await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: message.type === 'user' ? 'candidate' : 'system',
          message: message.content,
          message_type: message.type,
          message_metadata: message.questionData ? {
            question_id: message.questionData.id,
            question_number: message.questionData.question_number,
            difficulty: message.questionData.difficulty,
            time_limit: message.questionData.time_limit,
            category: message.questionData.category,
            isCurrentQuestion: message.isCurrentQuestion
          } : null
        })
      });
    } catch (error) {
      console.error('Failed to save chat message to backend:', error);
    }
  }, [sessionToken]);

  // Watch for new chat messages and save them to backend
  const previousMessageCountRef = useRef(0);
  useEffect(() => {
    // Only save new messages, not initial load or bulk replacements
    if (chatMessages.length > previousMessageCountRef.current &&
        previousMessageCountRef.current > 0) {
      // Save only the new messages (from the previous count onwards)
      const newMessages = chatMessages.slice(previousMessageCountRef.current);
      newMessages.forEach(message => saveChatMessageToBackend(message));
    }
    previousMessageCountRef.current = chatMessages.length;
  }, [chatMessages, saveChatMessageToBackend]);

  // Handle continuing interview
  const handleContinueInterview = useCallback(async (showDialog = true) => {
    if (!sessionToken) return;

    try {
      const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/continue-interview`, {
        method: 'POST',
      });

      if (response.ok) {

        const data: ContinueResponse = await response.json();
        // --- DEBUG: Resume logic ---
        console.log('[RESUME] ContinueResponse:', data);

        setQuestions(data.questions);
        // Pre-fill answers
        const answersArray = new Array(data.questions.length).fill('');
        data.existing_answers.forEach(answer => {
          const questionIndex = data.questions.findIndex(q => q.id === answer.question_id);
          if (questionIndex !== -1) {
            answersArray[questionIndex] = answer.answer_text;
          }
        });

        // --- DEBUG: Answers array after prefill ---
        console.log('[RESUME] Prefilled answersArray:', answersArray);

        // Find the first unanswered question index
        const firstUnansweredIdx = answersArray.findIndex(a => !a);
        const resumeIdx = firstUnansweredIdx === -1 ? answersArray.length : firstUnansweredIdx;

        // --- DEBUG: Resume index calculation ---
        console.log('[RESUME] First unanswered index:', firstUnansweredIdx, 'Resume index:', resumeIdx);

        // Update interview state
        setInterviewState(prev => ({
          ...prev,
          phase: (answersArray.filter(a => a).length >= TOTAL_QUESTIONS) ? 'completed' : 'interview',
          currentQuestionIndex: resumeIdx,
          answers: answersArray,
          timeRemaining: 0
        }));

        // --- DEBUG: Interview state after resume ---
        setTimeout(() => {
          console.log('[RESUME] InterviewState after set:', {
            phase: (answersArray.filter(a => a).length >= TOTAL_QUESTIONS) ? 'completed' : 'interview',
            currentQuestionIndex: resumeIdx,
            answers: answersArray
          });
        }, 0);

        // Pre-fill candidate info if available
        if (data.candidate_info.name || data.candidate_info.email || data.candidate_info.phone) {
          setCandidateInfo({
            name: data.candidate_info.name || '',
            email: data.candidate_info.email || '',
            phone: data.candidate_info.phone || ''
          });
        }

        // Why is chat rebuilt here?
        // The chat UI must show the correct current question and timer for the resumed state.
        // If you resume at question 3, the chat should show only the system message and the current question/timer, not all previous chat history.
        // This keeps the UI focused and avoids confusion for the candidate.
        const chat: ChatMessage[] = [];
        chat.push({
          type: 'system',
          content: `${data.message}. Resuming from question ${resumeIdx + 1}.`,
          timestamp: new Date()
        });
        if (resumeIdx < data.questions.length) {
          const currentQuestion = data.questions[resumeIdx];
          chat.push({
            type: 'question',
            content: `**Question ${resumeIdx + 1}** (${currentQuestion.difficulty.toUpperCase()} - ${currentQuestion.time_limit}s)\n\n${currentQuestion.question}`,
            timestamp: new Date(),
            questionData: currentQuestion,
            isCurrentQuestion: true
          });
          chat.push({
            type: 'timer',
            content: `⏱️ You have ${currentQuestion.time_limit} seconds to answer this question.`,
            timestamp: new Date()
          });
        }
        setChatMessages(chat);
        setCurrentAnswer(answersArray[resumeIdx] || '');
        if (showDialog) {
          setShowContinueDialog(false);
        }

      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to continue interview');
      }
    } catch {
      setError('Failed to continue interview');
    }
  }, [sessionToken]);

  // Load session info and check for continue status
  const loadSessionInfo = useCallback(async () => {
    if (!sessionToken) return;

    try {
      // First, get session info
      const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/info`);
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data);

        // Check continue status
        const continueResponse = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/continue-status`);
        if (continueResponse.ok) {
          const continueData = await continueResponse.json();
          console.log('Continue status data:', continueData);
          setContinueStatus(continueData);

          // Check if retry limit exceeded
          if (!continueData.can_continue && continueData.reason === "Maximum retry limit reached") {
            setError("You have reached the maximum number of retry attempts (2) for this interview.");
            return;
          }

          // Only show continue dialog on initial page load if there are actual questions and some progress
          if (isInitialLoad &&
              continueData.has_progress &&
              continueData.can_continue &&
              continueData.total_questions > 0 &&
              continueData.answered_questions < TOTAL_QUESTIONS) {
            setShowContinueDialog(true);
            setIsInitialLoad(false);
            return; // Exit early to show dialog
          }
        }

        // Add welcome message only if no progress
        if (chatMessages.length === 0) {
          console.log('Adding welcome message, current phase:', interviewState.phase);
          console.log('Missing fields:', missingFields);

          // Ensure we're in upload phase initially if no file uploaded yet
          if (!selectedFile && interviewState.phase === 'missing-info') {
            console.log('Resetting phase to upload');
            setInterviewState(prev => ({ ...prev, phase: 'upload' }));
          }

          setChatMessages([{
            type: 'system',
            content: `Welcome to your interview for ${data.position_title}! I'll guide you through this process step by step.\n\nFirst, please upload your resume (PDF or DOCX format). Click on "Choose File" below to get started.`,
            timestamp: new Date()
          }]);
        }

        // Mark initial load as complete
        setIsInitialLoad(false);
      } else {
        setError('Session not found or interview complete please close this window');
      }
    } catch (error) {
      console.error('Error loading session info:', error);
      setError('Failed to load session information');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, chatMessages.length, isInitialLoad]);

  useEffect(() => {
    if (sessionToken) {
      loadSessionInfo();
    }
  }, [sessionToken, loadSessionInfo]);

  // Timer management
  const startTimer = useCallback((timeLimit: number) => {
    setInterviewState(prev => ({ ...prev, timeRemaining: timeLimit }));
    setIsTimerActive(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setInterviewState(prev => {
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          // Time's up - handled elsewhere
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerActive(false);
  }, []);

  // Auto-start timer when interview phase becomes active
  useEffect(() => {
    // Only auto-start timer if not already active, not submitting, and not waiting for auto-submit
    if (
      interviewState.phase === 'interview' &&
      questions.length > 0 &&
      interviewState.currentQuestionIndex < TOTAL_QUESTIONS &&
      !isTimerActive &&
      interviewState.timeRemaining === 0 &&
      !submittingAnswer &&
      currentAnswer === ''
    ) {
      const currentQuestion = questions[interviewState.currentQuestionIndex];
      if (currentQuestion) {
        startTimer(currentQuestion.time_limit);
      }
    }
  }, [interviewState.phase, interviewState.currentQuestionIndex, questions, isTimerActive, interviewState.timeRemaining, startTimer, submittingAnswer, currentAnswer]);

  // Watch for timer expiry and auto-submit
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // When timer expires, always auto-submit, even if answer is empty
    if (interviewState.timeRemaining === 0 && isTimerActive && interviewState.phase === 'interview') {
      stopTimer();
      // Directly call submitAnswer with autoSubmit=true to guarantee submission
      submitAnswer(currentAnswer, true);
    }
  }, [interviewState.timeRemaining, isTimerActive, interviewState.phase, stopTimer, currentAnswer]);

  // Resume upload
  const handleFileUpload = async () => {
    if (!selectedFile || !sessionToken) return;

    setUploadLoading(true);

    // Add user message about file upload
    setChatMessages(prev => [
      ...prev,
      {
        type: 'user',
        content: `📎 Uploaded resume: ${selectedFile.name}`,
        timestamp: new Date()
      }
    ]);

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/upload-resume`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCandidateInfo(prev => ({ ...prev, ...data.extracted_data }));
        setMissingFields(data.missing_fields || []);

        // Add AI response about successful processing
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: `✅ Great! I've successfully processed your resume and extracted the following information:\n\n${Object.entries(data.extracted_data)
              .filter(([, value]) => value)
              .map(([key, value]) => `• ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
              .join('\n')}`,
            timestamp: new Date()
          }
        ]);

        if (data.missing_fields && data.missing_fields.length > 0) {
          setInterviewState(prev => ({ ...prev, phase: 'missing-info' }));
          setChatMessages(prev => [
            ...prev,
            {
              type: 'system',
              content: `I notice some required information is missing from your resume. Could you please provide the following details:\n\n${data.missing_fields.map((field: string) => `• ${field.charAt(0).toUpperCase() + field.slice(1)}`).join('\n')}\n\nPlease fill in these details below so we can proceed with your interview.`,
              timestamp: new Date()
            }
          ]);
        } else {
          setChatMessages(prev => [
            ...prev,
            {
              type: 'system',
              content: "Perfect! I have all the information I need. Let me now generate your technical interview questions. This may take a moment...",
              timestamp: new Date()
            }
          ]);
          startInterview();
        }
      } else {
        const errorData = await response.json();
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: `❌ Sorry, there was an issue processing your resume: ${errorData.detail || 'Upload failed'}. Please try uploading your resume again.`,
            timestamp: new Date()
          }
        ]);
        setError(errorData.detail || 'Failed to upload resume');
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: `❌ Sorry, there was a technical issue uploading your resume. Please check your internet connection and try again.`,
          timestamp: new Date()
        }
      ]);
      setError('Failed to upload resume');
    } finally {
      setUploadLoading(false);
    }
  };

  // Submit missing info
  const submitMissingInfo = async () => {
    if (!sessionToken) return;

    try {
      // Ensure all required fields are present
      const requiredFields = ['name', 'email', 'phone'];
      const missing = requiredFields.filter(f => !candidateInfo[f as keyof CandidateInfo]);
      if (missing.length > 0) {
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: `❌ Please fill in all required fields: ${missing.join(', ')}`,
            timestamp: new Date()
          }
        ]);
        setError('Please fill all required fields: ' + missing.join(', '));
        return;
      }

      // Add user message about submitting info
      setChatMessages(prev => [
        ...prev,
        {
          type: 'user',
          content: `✅ Provided additional information:\n• Name: ${candidateInfo.name}\n• Email: ${candidateInfo.email}\n• Phone: ${candidateInfo.phone}`,
          timestamp: new Date()
        }
      ]);

      // Map frontend fields to backend keys
      const backendCandidateInfo = {
        candidate_name: candidateInfo.name,
        candidate_email: candidateInfo.email,
        candidate_phone: candidateInfo.phone
      };

      const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/candidate-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendCandidateInfo)
      });

      if (response.ok) {
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: "Perfect! Now I have all the information I need. Let me generate your technical interview questions. This may take a moment...",
            timestamp: new Date()
          }
        ]);
        setMissingFields([]); // Clear missing fields so interview can start
        startInterview();
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: "❌ There was an issue updating your information. Please try again.",
            timestamp: new Date()
          }
        ]);
        setError('Failed to update information');
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'system',
          content: "❌ There was a technical issue updating your information. Please check your connection and try again.",
          timestamp: new Date()
        }
      ]);
      setError('Failed to update information');
    }
  };

  // Start interview
  const startInterview = async () => {
    if (!sessionToken) return;

    setStartingInterview(true);
    setGeneratingQuestions(true);

    try {
      console.log('[DEBUG] startInterview: sessionToken', sessionToken);
      const url = `https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/start-interview`;
      console.log('[DEBUG] startInterview: POST', url);
      const response = await fetch(url, {
        method: 'POST',
      });
      console.log('[DEBUG] startInterview: response status', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] startInterview: response data', data);
        setQuestions(data.questions || []);
        setInterviewState(prev => ({
          ...prev,
          phase: 'interview',
          answers: new Array(data.questions?.length || 6).fill(''),
          currentQuestionIndex: 0
        }));

        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: "Excellent! I've generated your personalized technical interview questions. You'll have 6 questions total:\n\n• 2 Easy questions (20 seconds each)\n• 2 Medium questions (60 seconds each) \n• 2 Hard questions (120 seconds each)\n\nLet's begin with your first question!",
            timestamp: new Date()
          }
        ]);

        // Ask first question
        if (data.questions && data.questions.length > 0) {
          askNextQuestion(0, data.questions);
        }
      } else {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = '[Could not parse error body]';
        }
        console.error('[ERROR] startInterview: response error', response.status, errorText);
        setError('Failed to start interview: ' + errorText);
      }
    } catch (err) {
      console.error('[ERROR] startInterview: exception', err);
      let errMsg = '';
      if (err && typeof err === 'object' && 'message' in err) {
        errMsg = (err as Error).message;
      } else {
        errMsg = String(err);
      }
      setError('Failed to start interview: ' + errMsg);
    } finally {
      setStartingInterview(false);
      setGeneratingQuestions(false);
    }
  };

  // Ask next question
  const askNextQuestion = (questionIndex: number, questionsList: Question[]) => {
    if (questionIndex >= questionsList.length) {
      completeInterview();
      return;
    }

    const question = questionsList[questionIndex];

    setChatMessages(prev => [
      ...prev,
      {
        type: 'question',
        content: `**Question ${questionIndex + 1}** (${question.difficulty.toUpperCase()} - ${question.time_limit}s)\n\n${question.question}`,
        timestamp: new Date(),
        questionData: question,
        isCurrentQuestion: true
      },
      {
        type: 'timer',
        content: `⏱️ You have ${question.time_limit} seconds to answer this question.`,
        timestamp: new Date()
      }
    ]);

    setCurrentAnswer('');
    startTimer(question.time_limit);
  };

  // Submit answer
  const submitAnswer = async (answer: string, autoSubmit: boolean = false) => {
    if (!sessionToken || interviewState.currentQuestionIndex >= TOTAL_QUESTIONS) return;

    setSubmittingAnswer(true);
    stopTimer();

    const currentQuestion = questions[interviewState.currentQuestionIndex];

    // Add user's answer to chat
    if (!autoSubmit && answer.trim()) {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'user',
          content: answer,
          timestamp: new Date()
        }
      ]);
    }

    try {
      const response = await fetch(`https://ai-poweredinterviewassistant.onrender.com/api/interview/${sessionToken}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_number: interviewState.currentQuestionIndex + 1,
          answer: answer,
          time_taken: currentQuestion.time_limit - interviewState.timeRemaining
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Update answers array
        const newAnswers = [...interviewState.answers];
        newAnswers[interviewState.currentQuestionIndex] = answer;

        const nextQuestionIndex = interviewState.currentQuestionIndex + 1;

        setInterviewState(prev => ({
          ...prev,
          answers: newAnswers,
          currentQuestionIndex: nextQuestionIndex
        }));

        // Show evaluation feedback
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: `✅ Answer submitted! Score: ${data.evaluation?.score || 0}/10`,
            timestamp: new Date()
          }
        ]);

        setCurrentAnswer('');

        // Move to next question or complete
        setTimeout(() => {
          if (nextQuestionIndex < TOTAL_QUESTIONS) {
            askNextQuestion(nextQuestionIndex, questions);
          } else {
            completeInterview();
          }
        }, 2000);
      }
    } catch {
      setError('Failed to submit answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Complete interview
  const completeInterview = async () => {
    setInterviewState(prev => ({ ...prev, phase: 'completed' }));
    stopTimer();

    setChatMessages(prev => [
      ...prev,
      {
        type: 'completed',
        content: "Interview completed! Thank you for your time. Your responses have been recorded and the interviewer will review them shortly.",
        timestamp: new Date()
      }
    ]);

    // Clear localStorage
    localStorage.removeItem(`interview_${sessionToken}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading interview session...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>

      </Container>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#f7f9fb', // very light gray for subtlety
      position: 'relative',
      overflow: 'auto'
    }}>

      {/* Continue Interview Dialog */}
      {showContinueDialog && continueStatus && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}>
          <Card sx={{
            maxWidth: 420,
            width: '100%',
            borderRadius: 3,
            boxShadow: 2,
            border: '1px solid #e0e0e0',
            background: '#fff'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{
                fontWeight: 600,
                mb: 2,
                color: 'text.primary',
                textAlign: 'center'
              }}>
                Continue Your Interview
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
                You have previously started this interview. You can continue from where you left off.
              </Typography>
              <Box sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                mb: 2,
                border: '1px solid #e0e0e0',
                textAlign: 'center'
              }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Progress:</strong> {continueStatus.answered_questions}/{continueStatus.total_questions} questions answered
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  <strong>Final Attempt</strong>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => handleContinueInterview(true)}
                  disabled={!canClickContinue}
                  sx={{ minWidth: 180 }}
                >
                  {canClickContinue ? 'Continue Interview' : `Please wait... (${continueCountdown}s)`}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Content Container */}
      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
        <Container maxWidth="lg">
          {/* Minimal Professional Header Card */}
          <Card elevation={0} sx={{
            mb: 4,
            borderRadius: 3,
            background: '#fff',
            border: '1px solid #e0e0e0',
            boxShadow: 1
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                <Box>
                  <Typography variant="h4" component="h1" sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <ChatIcon sx={{ mr: 2, color: 'primary.main', fontSize: '2.2rem' }} />
                    Technical Interview
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontWeight: 400, ml: 7 }}>
                    {sessionInfo?.position_title ? `Interview for ${sessionInfo.position_title}` : ''}
                  </Typography>
                </Box>
                {interviewState.phase === 'interview' && (
                  <Card sx={{
                    background: '#f5f5f5',
                    borderRadius: 2,
                    color: 'text.primary',
                    border: '1px solid #e0e0e0',
                    boxShadow: 0,
                    p: 2,
                    minWidth: 160
                  }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Question {interviewState.currentQuestionIndex + 1} of {TOTAL_QUESTIONS}
                    </Typography>
                  </Card>
                )}
              </Box>
              {interviewState.phase === 'interview' && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        background: '#1976d2',
                        borderRadius: 4
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary', fontWeight: 400 }}>
                    Progress: {Math.round((interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Modern Chat Interface - Missing Info Phase */}
          {interviewState.phase === 'missing-info' && (
            <Card elevation={0} sx={{
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 0 }}>
                {/* Chat Messages */}
                <Box sx={{
                  height: '60vh',
                  overflow: 'auto',
                  p: 3,
                  background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)'
                }}>
                  {chatMessages.map((message, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 3,
                        display: 'flex',
                        justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                        animation: 'fadeInUp 0.5s ease-out'
                      }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          maxWidth: '85%',
                          borderRadius: message.type === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                          background: message.type === 'user' ?
                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                            message.type === 'question' ?
                            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' :
                            message.type === 'completed' ?
                            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' :
                            'rgba(255, 255, 255, 0.9)',
                          color: message.type === 'user' ? 'white' : '#2d3748',
                          boxShadow: message.type === 'user' ?
                            '0 4px 20px rgba(102, 126, 234, 0.3)' :
                            '0 4px 20px rgba(0, 0, 0, 0.08)',
                          border: message.type !== 'user' ? '1px solid rgba(255, 255, 255, 0.5)' : 'none'
                        }}
                      >
                        <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body1" sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            fontWeight: message.type === 'user' ? 500 : 400
                          }}>
                            {message.content}
                          </Typography>
                          {message.questionData && (
                            <Chip
                              label={`${message.questionData.difficulty.toUpperCase()} - ${message.questionData.time_limit}s`}
                              size="small"
                              sx={{
                                mt: 1,
                                background: getDifficultyColor(message.questionData.difficulty) === 'success' ?
                                  'rgba(76, 175, 80, 0.1)' :
                                  getDifficultyColor(message.questionData.difficulty) === 'warning' ?
                                  'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                color: getDifficultyColor(message.questionData.difficulty) === 'success' ?
                                  '#4caf50' :
                                  getDifficultyColor(message.questionData.difficulty) === 'warning' ?
                                  '#ff9800' : '#f44336',
                                fontWeight: 600
                              }}
                            />
                          )}
                          <Typography variant="caption" display="block" sx={{
                            mt: 1,
                            opacity: 0.8,
                            fontSize: '0.75rem'
                          }}>
                            {message.timestamp.toLocaleTimeString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                {/* Enhanced Missing Info Form */}
                <Box sx={{
                  p: 4,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderTop: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <Typography variant="h5" sx={{
                    mb: 3,
                    fontWeight: 700,
                    color: '#2d3748',
                    textAlign: 'center'
                  }}>
                    📝 Complete Your Profile
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                    {missingFields.map((field) => (
                      <Box key={field}>
                        <TextField
                          label={field.charAt(0).toUpperCase() + field.slice(1)}
                          value={candidateInfo[field as keyof CandidateInfo] || ''}
                          onChange={(e) => setCandidateInfo(prev => ({
                            ...prev,
                            [field]: e.target.value
                          }))}
                          fullWidth
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 3,
                              backgroundColor: 'rgba(255, 255, 255, 0.8)',
                              '&:hover fieldset': {
                                borderColor: '#667eea',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#667eea',
                              },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                              color: '#667eea',
                            }
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                  <Button
                    variant="contained"
                    onClick={submitMissingInfo}
                    fullWidth
                    size="large"
                    disabled={missingFields.some(field => !candidateInfo[field as keyof CandidateInfo]) || startingInterview}
                    startIcon={startingInterview ? <CircularProgress size={20} color="inherit" /> : ''}
                    sx={{
                      mt: 4,
                      py: 2,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                        boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        boxShadow: 'none'
                      }
                    }}
                  >
                    {startingInterview ? 'Starting Interview...' : 'Continue to Interview'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Modern Chat Interface - Upload Phase */}
          {interviewState.phase === 'upload' && (
            <Card elevation={0} sx={{
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 0 }}>
                {/* Chat Messages */}
                <Box sx={{
                  height: '50vh',
                  overflow: 'auto',
                  p: 3,
                  background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)'
                }}>
                  {chatMessages.map((message, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 3,
                        display: 'flex',
                        justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                        animation: 'fadeInUp 0.5s ease-out'
                      }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          maxWidth: '85%',
                          borderRadius: message.type === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                          background: message.type === 'user' ?
                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                            message.type === 'question' ?
                            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' :
                            message.type === 'completed' ?
                            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' :
                            'rgba(255, 255, 255, 0.9)',
                          color: message.type === 'user' ? 'white' : '#2d3748',
                          boxShadow: message.type === 'user' ?
                            '0 4px 20px rgba(102, 126, 234, 0.3)' :
                            '0 4px 20px rgba(0, 0, 0, 0.08)',
                          border: message.type !== 'user' ? '1px solid rgba(255, 255, 255, 0.5)' : 'none'
                        }}
                      >
                        <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body1" sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            fontWeight: message.type === 'user' ? 500 : 400
                          }}>
                            {message.content}
                          </Typography>
                          <Typography variant="caption" display="block" sx={{
                            mt: 1,
                            opacity: 0.8,
                            fontSize: '0.75rem'
                          }}>
                            {message.timestamp.toLocaleTimeString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                  <div ref={chatEndRef} />
                </Box>

                {/* Resume Upload Interface within Chat */}
                <Box sx={{
                  p: 4,
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderTop: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <Typography variant="h6" sx={{
                    mb: 3,
                    fontWeight: 600,
                    color: '#2d3748',
                    textAlign: 'center'
                  }}>
                    📄 Upload Your Resume
                  </Typography>

                  <Box sx={{ maxWidth: '400px', mx: 'auto' }}>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        size="large"
                        startIcon={<UploadIcon />}
                        fullWidth
                        sx={{
                          mb: 2,
                          py: 2,
                          borderRadius: 3,
                          borderColor: '#667eea',
                          color: '#667eea',
                          fontWeight: 600,
                          textTransform: 'none',
                          fontSize: '1.1rem',
                          borderWidth: '2px',
                          '&:hover': {
                            borderColor: '#5a67d8',
                            backgroundColor: 'rgba(102, 126, 234, 0.04)',
                            borderWidth: '2px'
                          }
                        }}
                      >
                        Choose Resume File
                      </Button>
                    </label>
                    {selectedFile && (
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        border: '1px solid rgba(102, 126, 234, 0.2)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#667eea', fontWeight: 600 }}>
                          📎 Selected: {selectedFile.name}
                        </Typography>
                      </Box>
                    )}
                    <Button
                      variant="contained"
                      onClick={handleFileUpload}
                      disabled={!selectedFile || uploadLoading || startingInterview || generatingQuestions}
                      fullWidth
                      size="large"
                      startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                      sx={{
                        py: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                          boxShadow: '0 12px 35px rgba(102, 126, 234, 0.4)',
                        },
                        '&:disabled': {
                          background: 'rgba(0, 0, 0, 0.12)',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {uploadLoading ? 'Processing Resume...' : startingInterview ? '🔄 Starting Interview...' : generatingQuestions ? '🤖 Generating Questions...' : 'Upload Resume'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Modern Interview Phase */}
          {interviewState.phase === 'interview' && interviewState.currentQuestionIndex < TOTAL_QUESTIONS && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Current Question Card */}
              <Card elevation={0} sx={{
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{
                    background: questions[interviewState.currentQuestionIndex]?.difficulty === 'easy' ?
                      'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' :
                      questions[interviewState.currentQuestionIndex]?.difficulty === 'medium' ?
                      'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)' :
                      'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
                    color: 'white',
                    p: 3
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={questions[interviewState.currentQuestionIndex]?.difficulty.toUpperCase() || 'UNKNOWN'}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.875rem'
                          }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ⏱️ Time Limit: {questions[interviewState.currentQuestionIndex]?.time_limit || 0}s
                        </Typography>
                      </Box>
                      {isTimerActive && (
                        <Box sx={{
                          background: 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          px: 3,
                          py: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <TimerIcon sx={{ fontSize: '1.5rem' }} />
                          <Typography variant="h5" sx={{
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: interviewState.timeRemaining <= 10 ? '#ff4757' : 'white'
                          }}>
                            {formatTime(interviewState.timeRemaining)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{
                      lineHeight: 1.6,
                      color: '#2d3748',
                      fontWeight: 600
                    }}>
                      {questions[interviewState.currentQuestionIndex]?.question || 'Loading question...'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Answer Input Card */}
              <Card elevation={0} sx={{
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" sx={{
                    mb: 3,
                    color: '#2d3748',
                    fontWeight: 600
                  }}>
                    Your Answer:
                  </Typography>
                  <TextField
                    multiline
                    rows={10}
                    placeholder="Type your answer here... Be specific and explain your reasoning step by step."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    fullWidth
                    variant="outlined"
                    disabled={submittingAnswer}
                    sx={{
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#667eea',
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {/* Lines 1319-1320 omitted */}
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Button
                      ref={submitBtnRef}
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => submitAnswer(currentAnswer, false)}
                      disabled={submittingAnswer || interviewState.phase !== 'interview'}
                      sx={{
                        minWidth: 120,
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        borderRadius: 3,
                        boxShadow: '0 4px 16px rgba(102, 126, 234, 0.15)',
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                        },
                        '&:disabled': {
                          background: 'rgba(0, 0, 0, 0.12)',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      {submittingAnswer ? '🔄 Submitting...' : 'Submit Answer'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Modern Completion Phase */}
              {interviewState.phase === 'interview' && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        background: '#1976d2',
                        borderRadius: 4
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary', fontWeight: 400 }}>
                    Progress: {Math.round((interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100)}%
                  </Typography>
                </Box>
              )}

          {/* Minimal Chat Interface - Missing Info Phase */}
          {interviewState.phase === 'missing-info' && (
            <Card elevation={0} sx={{
              borderRadius: 3,
              background: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: 1,
              overflow: 'hidden',
              mb: 4
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Please complete your profile to continue.</Typography>
                {/* ...form fields and submit button... */}
              </CardContent>
            </Card>
          )}

          {/* Minimal Chat Interface - Upload Phase */}
          {interviewState.phase === 'upload' && (
            <Card elevation={0} sx={{
              borderRadius: 3,
              background: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: 1,
              overflow: 'hidden',
              mb: 4
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Upload your resume to begin the interview.</Typography>
                {/* ...upload form and chat... */}
              </CardContent>
            </Card>
          )}

          {/* Minimal Interview Phase */}
          {interviewState.phase === 'interview' && interviewState.currentQuestionIndex < TOTAL_QUESTIONS && (
            <Card elevation={0} sx={{
              borderRadius: 3,
              background: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: 1,
              overflow: 'hidden',
              mb: 4
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Answer the question below:</Typography>
                {/* ...question and answer input... */}
              </CardContent>
            </Card>
          )}

          {/* Minimal Completion Phase */}
          {interviewState.phase === 'completed' && (
            <Card elevation={0} sx={{
              borderRadius: 3,
              background: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: 1,
              textAlign: 'center',
              mb: 4
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, color: 'success.main' }}>Interview Complete!</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                  Thank you for your time and thoughtful responses. Your interview has been successfully completed and submitted for review.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  ✨ You may now safely close this window
                </Typography>
              </CardContent>
            </Card>
          )}

        </Container>
      </Box>
    </Box>
  );
}


export default CandidateInterviewPage;