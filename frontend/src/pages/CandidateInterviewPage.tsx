import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Send as SendIcon,
  Timer as TimerIcon,
  CheckCircle as CompleteIcon,
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
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const navigate = useNavigate();


  // ...existing code...

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [continueStatus, setContinueStatus] = useState<ContinueStatus | null>(null);

  // If can_continue is false, show interview completed state (do not navigate away)
  useEffect(() => {
    if (continueStatus && continueStatus.can_continue === false) {
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
  }, [continueStatus, sessionToken]);

  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Interview state management
  const [interviewState, setInterviewState] = useState<InterviewState>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem(`interview_${sessionToken}`);
    if (saved) {
      return JSON.parse(saved);
    }
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

  // Handle continuing interview
  const handleContinueInterview = useCallback(async (showDialog = true) => {
    if (!sessionToken) return;

    try {
      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/continue-interview`, {
        method: 'POST',
      });

      if (response.ok) {
        const data: ContinueResponse = await response.json();

        setQuestions(data.questions);

        // Pre-fill answers
        const answersArray = new Array(data.questions.length).fill('');
        data.existing_answers.forEach(answer => {
          const questionIndex = data.questions.findIndex(q => q.id === answer.question_id);
          if (questionIndex !== -1) {
            answersArray[questionIndex] = answer.answer_text;
          }
        });

        // Update interview state
        setInterviewState(prev => ({
          ...prev,
          phase: data.next_question_index >= TOTAL_QUESTIONS ? 'completed' : 'interview',
          currentQuestionIndex: data.next_question_index >= TOTAL_QUESTIONS ? TOTAL_QUESTIONS : data.next_question_index,
          answers: answersArray,
          timeRemaining: 0 // Always reset timer to 0 so timer auto-starts for the correct question
        }));

        // Pre-fill candidate info if available
        if (data.candidate_info.name || data.candidate_info.email || data.candidate_info.phone) {
          setCandidateInfo({
            name: data.candidate_info.name || '',
            email: data.candidate_info.email || '',
            phone: data.candidate_info.phone || ''
          });
        }

        // Rebuild chat: system message, then only the current question/timer
        const chat: ChatMessage[] = [];
        chat.push({
          type: 'system',
          content: `${data.message}. Resuming from question ${data.next_question_index + 1}.`,
          timestamp: new Date()
        });
        if (data.next_question_index < TOTAL_QUESTIONS) {
          const currentQuestion = data.questions[data.next_question_index];
          chat.push({
            type: 'question',
            content: `**Question ${data.next_question_index + 1}** (${currentQuestion.difficulty.toUpperCase()} - ${currentQuestion.time_limit}s)\n\n${currentQuestion.question}`,
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

        setCurrentAnswer('');

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
      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/info`);
      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data);

        // Check continue status
        const continueResponse = await fetch(`http://localhost:8000/api/interview/${sessionToken}/continue-status`);
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
          setChatMessages([{
            type: 'system',
            content: `Welcome to your interview for ${data.position_title}! Let's start by uploading your resume.`,
            timestamp: new Date()
          }]);
        }

        // Mark initial load as complete
        setIsInitialLoad(false);
      } else {
        setError('Session not found or expired');
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
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);

      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/upload-resume`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCandidateInfo(prev => ({ ...prev, ...data.extracted_data }));
        setMissingFields(data.missing_fields || []);

        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: `✅ Resume uploaded successfully! I extracted your information: ${JSON.stringify(data.extracted_data, null, 2)}`,
            timestamp: new Date()
          }
        ]);

        if (data.missing_fields && data.missing_fields.length > 0) {
          setInterviewState(prev => ({ ...prev, phase: 'missing-info' }));
          setChatMessages(prev => [
            ...prev,
            {
              type: 'system',
              content: `I need some additional information from you: ${data.missing_fields.join(', ')}. Please provide these details.`,
              timestamp: new Date()
            }
          ]);
        } else {
          startInterview();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to upload resume');
      }
    } catch {
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
        setError('Please fill all required fields: ' + missing.join(', '));
        return;
      }

      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/candidate-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(candidateInfo)
      });

      if (response.ok) {
        setChatMessages(prev => [
          ...prev,
          {
            type: 'system',
            content: "✅ Information updated! Now let's begin the technical interview.",
            timestamp: new Date()
          }
        ]);
        setMissingFields([]); // Clear missing fields so interview can start
        startInterview();
      } else {
        setError('Failed to update information');
      }
    } catch {
      setError('Failed to update information');
    }
  };

  // Start interview
  const startInterview = async () => {
    if (!sessionToken) return;

    setStartingInterview(true);
    setGeneratingQuestions(true);

    try {
      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/start-interview`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
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
            content: "🚀 Starting your technical interview! You'll have 6 questions total: 2 Easy (20s each), 2 Medium (60s each), and 2 Hard (120s each).",
            timestamp: new Date()
          }
        ]);

        // Ask first question
        if (data.questions && data.questions.length > 0) {
          askNextQuestion(0, data.questions);
        }
      } else {
        setError('Failed to start interview');
      }
    } catch {
      setError('Failed to start interview');
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
      const response = await fetch(`http://localhost:8000/api/interview/${sessionToken}/submit-answer`, {
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
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Go Home
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Animated Background Particles */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%)',
        zIndex: -1
      }} />

      {/* Continue Interview Dialog */}
      {showContinueDialog && continueStatus && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}>
          <Card sx={{
            maxWidth: 500,
            width: '100%',
            borderRadius: 4,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 700,
                mb: 2,
                color: '#1a202c',
                textAlign: 'center'
              }}>
                Continue Your Interview?
              </Typography>

              <Typography variant="body1" sx={{
                mb: 3,
                color: '#4a5568',
                textAlign: 'center',
                lineHeight: 1.6
              }}>
                You have previously started this interview. You can continue from where you left off.
              </Typography>

              <Box sx={{
                backgroundColor: '#f7fafc',
                p: 3,
                borderRadius: 2,
                mb: 3,
                border: '1px solid #e2e8f0'
              }}>
                <Typography variant="body2" sx={{ color: '#2d3748', mb: 1 }}>
                  <strong>Progress:</strong> {continueStatus.answered_questions}/{continueStatus.total_questions} questions answered
                </Typography>
                <Typography variant="body2" sx={{ color: '#2d3748', mb: 1 }}>
                  <strong>Attempts:</strong> {continueStatus.retry_count}/1
                </Typography>
              </Box>

              <Box sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                mt: 3
              }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowContinueDialog(false);
                    // Reset to fresh state
                    setInterviewState({
                      phase: 'upload',
                      currentQuestionIndex: 0,
                      answers: [],
                      timeRemaining: 0
                    });
                  }}
                  sx={{
                    borderColor: '#e2e8f0',
                    color: '#4a5568',
                    '&:hover': {
                      borderColor: '#cbd5e0',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  Start Fresh
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleContinueInterview(true)}
                  sx={{
                    backgroundColor: '#667eea',
                    '&:hover': {
                      backgroundColor: '#5a67d8'
                    }
                  }}
                >
                  Continue Interview
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Content Container */}
      <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
        <Container maxWidth="lg">
          {/* Modern Header Card */}
          <Card elevation={0} sx={{
            mb: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
                <Box>
                  <Typography variant="h3" component="h1" sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <ChatIcon sx={{ mr: 2, color: '#667eea', fontSize: '2.5rem' }} />
                    Technical Interview
                  </Typography>
                  <Typography variant="h6" sx={{
                    color: 'text.secondary',
                    fontWeight: 500,
                    ml: 7
                  }}>
                    {sessionInfo?.position_title || 'Full Stack Developer Position'}
                  </Typography>
                </Box>
                {interviewState.phase === 'interview' && (
                  <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 3,
                    color: 'white'
                  }}>
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                        Question {interviewState.currentQuestionIndex + 1} of {TOTAL_QUESTIONS}
                      </Typography>
                      {continueStatus && continueStatus.retry_count > 0 && (
                        <Typography variant="body2" sx={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          mb: 1,
                          fontSize: '0.85rem'
                        }}>
                          Attempt {continueStatus.retry_count}/1
                        </Typography>
                      )}
                      {isTimerActive && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <TimerIcon sx={{
                            color: interviewState.timeRemaining <= 10 ? '#ff4757' : 'white',
                            fontSize: '1.5rem'
                          }} />
                          <Typography
                            variant="h4"
                            sx={{
                              color: interviewState.timeRemaining <= 10 ? '#ff4757' : 'white',
                              fontWeight: 800,
                              fontFamily: 'monospace'
                            }}
                          >
                            {formatTime(interviewState.timeRemaining)}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Box>

              {interviewState.phase === 'interview' && (
                <Box sx={{ mt: 3 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 6
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{
                    mt: 1,
                    textAlign: 'center',
                    color: 'text.secondary',
                    fontWeight: 500
                  }}>
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
                    disabled={missingFields.some(field => !candidateInfo[field as keyof CandidateInfo])}
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
                    🚀 Continue to Interview
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Modern Upload Phase */}
          {interviewState.phase === 'upload' && (
            <Card elevation={0} sx={{
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <CardContent sx={{ p: 6 }}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" sx={{
                    fontWeight: 700,
                    color: '#2d3748',
                    mb: 2
                  }}>
                    📄 Upload Your Resume
                  </Typography>
                  <Typography variant="body1" sx={{
                    color: 'text.secondary',
                    fontSize: '1.1rem',
                    maxWidth: '500px',
                    mx: 'auto',
                    lineHeight: 1.6
                  }}>
                    Upload your resume to get started with your technical interview. We support PDF and DOCX formats.
                  </Typography>
                </Box>

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
                    {uploadLoading ? 'Processing Resume...' : startingInterview ? '🔄 Starting Interview...' : generatingQuestions ? '🤖 Generating Questions...' : '🚀 Start Interview'}
                  </Button>
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
                    💭 Your Answer:
                  </Typography>
                  <TextField
                    multiline
                    rows={10}
                    placeholder="Type your answer here... Be specific and explain your reasoning step by step."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    fullWidth
                    variant="outlined"
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
                      {submittingAnswer ? '🔄 Submitting...' : '🚀 Submit Answer'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Modern Completion Phase */}
          {interviewState.phase === 'completed' && (
            <Card elevation={0} sx={{
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <CardContent sx={{ p: 6 }}>
                <Box sx={{ mb: 4 }}>
                  <CompleteIcon sx={{
                    fontSize: '4rem',
                    color: '#48bb78',
                    mb: 2,
                    filter: 'drop-shadow(0 4px 8px rgba(72, 187, 120, 0.3))'
                  }} />
                  <Typography variant="h3" sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2
                  }}>
                    Interview Complete!
                  </Typography>
                  <Typography variant="h6" sx={{
                    color: 'text.secondary',
                    maxWidth: '500px',
                    mx: 'auto',
                    lineHeight: 1.6
                  }}>
                    Thank you for your time and thoughtful responses. Your interview has been successfully completed and submitted for review.
                  </Typography>
                </Box>
                <Box sx={{
                  background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.1) 100%)',
                  borderRadius: 3,
                  p: 3,
                  border: '1px solid rgba(72, 187, 120, 0.2)'
                }}>
                  <Typography variant="body1" sx={{
                    color: '#2d3748',
                    fontWeight: 500
                  }}>
                    ✨ You may now safely close this window
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default CandidateInterviewPage;