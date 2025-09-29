import React, { useState, useEffect } from 'react';
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
  Paper,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Timer as TimerIcon,
  CheckCircle as CompleteIcon,
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

// Demo interfaces for clean UI

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

const TOTAL_QUESTIONS = 6; // Interview always has 6 questions

const CandidateInterviewPage: React.FC = () => {

  // --- Continue Interview Button Timeout ---
  const [showContinueDialog] = useState(false);
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

  // Core state
  const [loading] = useState(false); // Set to false for demo
  const [error] = useState<string | null>(null);
  const [sessionInfo] = useState<SessionInfo | null>({ 
    position_title: 'Full Stack Developer',
    candidate_email: 'demo@example.com',
    status: 'active',
    created_at: new Date().toISOString()
  });
  const [continueStatus] = useState<ContinueStatus | null>(null);

  // Interview state management
  const [interviewState] = useState<InterviewState>({
    phase: 'upload',
    currentQuestionIndex: 0,
    answers: [],
    timeRemaining: 0
  });

  // Resume upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({});
  const [missingFields] = useState<string[]>([]);

  // Interview loading states
  const [startingInterview] = useState(false);
  const [submittingAnswer] = useState(false);

  // Chat interface
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questions] = useState<Question[]>([]);

  // Timer management
  const [isTimerActive] = useState(false);

  // All the existing logic would go here...
  // For now, let's just implement the basic structure

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      backgroundColor: '#f8f9fa'
    }}>
      {/* Continue Interview Dialog */}
      {showContinueDialog && continueStatus && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}>
          <Card sx={{
            maxWidth: 500,
            width: '100%',
            borderRadius: 2,
            boxShadow: 3
          }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{
                fontWeight: 600,
                mb: 2,
                color: '#1976d2',
                textAlign: 'center'
              }}>
                Continue Your Interview?
              </Typography>

              <Typography variant="body1" sx={{
                mb: 3,
                color: 'text.secondary',
                textAlign: 'center'
              }}>
                You have previously started this interview. You can continue from where you left off.
              </Typography>

              <Box sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                mb: 3,
                border: '1px solid #e0e0e0'
              }}>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 1 }}>
                  <strong>Progress:</strong> {continueStatus.answered_questions}/{continueStatus.total_questions} questions answered
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  <strong>Final Attempt - Do Not Reload</strong>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => {/* handleContinueInterview logic */}}
                  disabled={!canClickContinue}
                  sx={{
                    backgroundColor: '#1976d2',
                    '&:hover': {
                      backgroundColor: '#1565c0'
                    }
                  }}
                >
                  {canClickContinue ? 'Continue Interview' : `Please wait... (${continueCountdown}s)`}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Content Container */}
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Paper elevation={0} sx={{
            mb: 4,
            p: 3,
            backgroundColor: 'white',
            border: '1px solid #e0e0e0'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" sx={{
                  fontWeight: 600,
                  color: '#1976d2',
                  mb: 1
                }}>
                  Technical Interview
                </Typography>
                <Typography variant="h6" sx={{
                  color: 'text.secondary',
                  fontWeight: 400
                }}>
                  {sessionInfo?.position_title || 'Full Stack Developer'}
                </Typography>
              </Box>
              {interviewState.phase === 'interview' && (
                <Paper sx={{
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                    Question {interviewState.currentQuestionIndex + 1} of {TOTAL_QUESTIONS}
                  </Typography>
                  {continueStatus && continueStatus.retry_count > 0 && (
                    <Typography variant="body2" sx={{
                      color: 'error.main',
                      mb: 1,
                      textAlign: 'center'
                    }}>
                      Final Attempt - Do Not Reload
                    </Typography>
                  )}
                  {isTimerActive && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <TimerIcon sx={{
                        color: interviewState.timeRemaining <= 10 ? 'error.main' : 'primary.main'
                      }} />
                      <Typography
                        variant="h5"
                        sx={{
                          color: interviewState.timeRemaining <= 10 ? 'error.main' : 'primary.main',
                          fontWeight: 600,
                          fontFamily: 'monospace'
                        }}
                      >
                        {formatTime(interviewState.timeRemaining)}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>

            {interviewState.phase === 'interview' && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress
                  variant="determinate"
                  value={(interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#e0e0e0'
                  }}
                />
                <Typography variant="body2" sx={{
                  mt: 1,
                  textAlign: 'center',
                  color: 'text.secondary'
                }}>
                  Progress: {Math.round((interviewState.currentQuestionIndex / TOTAL_QUESTIONS) * 100)}%
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Upload Phase */}
          {interviewState.phase === 'upload' && (
            <Paper elevation={0} sx={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{
                  mb: 3,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  Upload Your Resume
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
                      component="span"
                      variant="outlined"
                      fullWidth
                      size="large"
                      startIcon={<UploadIcon />}
                      sx={{
                        mb: 2,
                        py: 2,
                        borderStyle: 'dashed'
                      }}
                    >
                      Choose Resume File
                    </Button>
                  </label>
                  {selectedFile && (
                    <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
                      Selected: {selectedFile.name}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={!selectedFile || uploadLoading}
                    startIcon={uploadLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                  >
                    {uploadLoading ? 'Processing...' : 'Upload Resume'}
                  </Button>
                </Box>
              </CardContent>
            </Paper>
          )}

          {/* Missing Info Phase */}
          {interviewState.phase === 'missing-info' && (
            <Paper elevation={0} sx={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{
                  mb: 3,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  Complete Your Profile
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                  {missingFields.map((field) => (
                    <TextField
                      key={field}
                      label={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={candidateInfo[field as keyof CandidateInfo] || ''}
                      onChange={(e) => setCandidateInfo(prev => ({ ...prev, [field]: e.target.value }))}
                      fullWidth
                      variant="outlined"
                      required
                    />
                  ))}
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={startingInterview}
                  startIcon={startingInterview ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {startingInterview ? 'Starting Interview...' : 'Continue to Interview'}
                </Button>
              </CardContent>
            </Paper>
          )}

          {/* Interview Phase */}
          {interviewState.phase === 'interview' && interviewState.currentQuestionIndex < TOTAL_QUESTIONS && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Current Question */}
              <Paper elevation={0} sx={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0'
              }}>
                <Box sx={{
                  backgroundColor: questions[interviewState.currentQuestionIndex]?.difficulty === 'easy' ? '#4caf50' :
                                  questions[interviewState.currentQuestionIndex]?.difficulty === 'medium' ? '#ff9800' : '#f44336',
                  color: 'white',
                  p: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={questions[interviewState.currentQuestionIndex]?.difficulty.toUpperCase() || 'UNKNOWN'}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Time Limit: {questions[interviewState.currentQuestionIndex]?.time_limit || 0}s
                      </Typography>
                    </Box>
                    {isTimerActive && (
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        px: 2,
                        py: 1,
                        borderRadius: 1
                      }}>
                        <TimerIcon />
                        <Typography variant="h6" sx={{
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          color: interviewState.timeRemaining <= 10 ? '#ffeb3b' : 'white'
                        }}>
                          {formatTime(interviewState.timeRemaining)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                    lineHeight: 1.6
                  }}>
                    {questions[interviewState.currentQuestionIndex]?.question || 'Loading question...'}
                  </Typography>
                </CardContent>
              </Paper>

              {/* Answer Input */}
              <Paper elevation={0} sx={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{
                    mb: 2,
                    color: 'text.primary',
                    fontWeight: 500
                  }}>
                    Your Answer:
                  </Typography>
                  <TextField
                    multiline
                    rows={8}
                    placeholder="Type your answer here..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    fullWidth
                    variant="outlined"
                    disabled={submittingAnswer}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={submittingAnswer}
                    startIcon={submittingAnswer ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                  </Button>
                </CardContent>
              </Paper>
            </Box>
          )}

          {/* Completion Phase */}
          {interviewState.phase === 'completed' && (
            <Paper elevation={0} sx={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <CardContent sx={{ p: 4 }}>
                <CompleteIcon sx={{
                  fontSize: '3rem',
                  color: '#4caf50',
                  mb: 2
                }} />
                <Typography variant="h4" sx={{
                  fontWeight: 600,
                  color: '#4caf50',
                  mb: 2
                }}>
                  Interview Complete!
                </Typography>
                <Typography variant="body1" sx={{
                  color: 'text.secondary',
                  maxWidth: '500px',
                  mx: 'auto',
                  mb: 3
                }}>
                  Thank you for your time and thoughtful responses. Your interview has been successfully completed and submitted for review.
                </Typography>
                <Typography variant="body2" sx={{
                  color: 'text.primary',
                  fontWeight: 500
                }}>
                  You may now safely close this window
                </Typography>
              </CardContent>
            </Paper>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default CandidateInterviewPage;