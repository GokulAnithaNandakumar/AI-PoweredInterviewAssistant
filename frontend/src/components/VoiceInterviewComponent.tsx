import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Alert,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Timer as TimerIcon,
  Keyboard as KeyboardIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useSpeechRecognition } from '../hooks';

interface Question {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit: number;
  category: string;
  question_number: number;
}

interface VoiceInterviewProps {
  question: Question;
  timeRemaining: number;
  totalTime: number;
  onAnswerSubmit: (answer: string) => void;
  onTimeExpired: () => void;
  onTranscriptUpdate?: (transcript: string) => void;
  isSubmitting?: boolean;
}

export const VoiceInterviewComponent: React.FC<VoiceInterviewProps> = ({
  question,
  timeRemaining = 60,
  totalTime = 60,
  onAnswerSubmit,
  onTimeExpired,
  onTranscriptUpdate,
  isSubmitting = false,
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  const [networkError, setNetworkError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const autoSubmitTriggered = useRef(false);
  
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition();

  // Check if speech recognition is supported and set up error handling
  useEffect(() => {
    if (isSupported) {
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
      setUseManualInput(true); // Fallback to manual input
      setErrorMessage('Speech recognition is not supported in this browser. Using manual input.');
    }
  }, [isSupported]);

  // Handle speech recognition errors
  useEffect(() => {
    if (speechError) {
      console.error('Speech recognition error:', speechError);
      setNetworkError(true);
      setErrorMessage(`Speech recognition error: ${speechError}. You can use manual input or try refreshing.`);
      // Auto-fallback to manual input on persistent errors
      if (!useManualInput) {
        setUseManualInput(true);
      }
    }
  }, [speechError, useManualInput]);

  // Update transcript
  useEffect(() => {
    if (transcript) {
      setCurrentAnswer(transcript);
      if (onTranscriptUpdate) {
        onTranscriptUpdate(transcript);
      }
    }
  }, [transcript, onTranscriptUpdate]);

  // Auto-submit when time expires
  useEffect(() => {
    if (timeRemaining <= 0 && !autoSubmitTriggered.current) {
      autoSubmitTriggered.current = true;
      stopListening();
      
      const finalAnswer = useManualInput 
        ? manualAnswer.trim() 
        : (currentAnswer + ' ' + interimTranscript).trim() || '[No answer provided - time expired]';
      
      onAnswerSubmit(finalAnswer);
      onTimeExpired();
    }
  }, [timeRemaining, currentAnswer, interimTranscript, manualAnswer, useManualInput, onAnswerSubmit, onTimeExpired, stopListening]);

  // Auto-start voice recording when component mounts (when timer starts)
  useEffect(() => {
    if (speechSupported && !hasStarted && timeRemaining > 0 && !useManualInput) {
      setHasStarted(true);
      // Small delay to ensure component is ready
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [speechSupported, hasStarted, timeRemaining, useManualInput, startListening]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleManualSubmit = () => {
    if (manualAnswer.trim()) {
      autoSubmitTriggered.current = true;
      onAnswerSubmit(manualAnswer.trim());
    }
  };

  const handleInputModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const useManual = event.target.checked;
    setUseManualInput(useManual);
    
    if (useManual) {
      stopListening();
      setErrorMessage('');
      setNetworkError(false);
    } else if (speechSupported) {
      setManualAnswer('');
      if (timeRemaining > 0 && !autoSubmitTriggered.current) {
        startListening();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success' as const;
      case 'medium': return 'warning' as const;
      case 'hard': return 'error' as const;
      default: return 'default' as const;
    }
  };

  const combinedTranscript = useManualInput 
    ? manualAnswer 
    : currentAnswer + (interimTranscript ? ' ' + interimTranscript : '');

  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  return (
    <Card elevation={3} sx={{ maxWidth: 800, margin: 'auto', mt: 2 }}>
      <CardContent>
        {/* Question Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`Q${question.question_number}`}
              color="primary"
              size="small"
            />
            <Chip
              label={question.difficulty.toUpperCase()}
              color={getDifficultyColor(question.difficulty)}
              size="small"
            />
            <Chip
              label={question.category}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <TimerIcon color={timeRemaining <= 10 ? 'error' : 'action'} />
            <Typography
              variant="h6"
              color={timeRemaining <= 10 ? 'error' : 'text.primary'}
              fontWeight="bold"
            >
              {formatTime(timeRemaining)}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mb: 2, height: 8, borderRadius: 4 }}
          color={timeRemaining <= 10 ? 'error' : 'primary'}
        />

        {/* Question Text */}
        <Typography variant="h6" mb={3} sx={{ lineHeight: 1.6 }}>
          {question.question}
        </Typography>

        {/* Input Mode Toggle */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={useManualInput}
                onChange={handleInputModeChange}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <KeyboardIcon />
                <Typography>Manual Input</Typography>
              </Box>
            }
          />

          {!useManualInput && speechSupported && (
            <Button
              variant={isListening ? "contained" : "outlined"}
              color={isListening ? "error" : "primary"}
              startIcon={isListening ? <MicOffIcon /> : <MicIcon />}
              onClick={handleToggleListening}
              disabled={timeRemaining <= 0}
            >
              {isListening ? 'Stop Recording' : 'Start Recording'}
            </Button>
          )}
        </Box>

        {/* Error Messages */}
        {errorMessage && (
          <Alert 
            severity={networkError ? "warning" : "info"} 
            sx={{ mb: 2 }}
            action={
              networkError && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => {
                    setErrorMessage('');
                    setNetworkError(false);
                    if (speechSupported && !useManualInput) {
                      startListening();
                    }
                  }}
                >
                  Retry Voice
                </Button>
              )
            }
          >
            {errorMessage}
          </Alert>
        )}

        {/* Answer Input Area */}
        {useManualInput ? (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Type your answer here..."
              value={manualAnswer}
              onChange={(e) => setManualAnswer(e.target.value)}
              disabled={timeRemaining <= 0 || isSubmitting}
              sx={{ mb: 2 }}
            />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Characters: {manualAnswer.length}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                onClick={handleManualSubmit}
                disabled={!manualAnswer.trim() || timeRemaining <= 0 || isSubmitting}
              >
                Submit Answer
              </Button>
            </Box>
          </Box>
        ) : (
          <Paper
            elevation={1}
            sx={{
              p: 2,
              minHeight: 120,
              backgroundColor: isListening ? 'action.hover' : 'background.paper',
              border: isListening ? '2px solid' : '1px solid',
              borderColor: isListening ? 'primary.main' : 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isListening ? '🎤 Recording...' : '🎤 Voice recording ready'}
            </Typography>
            <Typography variant="body1" sx={{ minHeight: 60, lineHeight: 1.6 }}>
              {combinedTranscript || 'Your answer will appear here as you speak...'}
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="body2" color="text.secondary">
                Words: {combinedTranscript.split(' ').filter(word => word.length > 0).length}
              </Typography>
              {isListening && (
                <Typography variant="body2" color="primary">
                  Listening...
                </Typography>
              )}
            </Box>
          </Paper>
        )}

        {/* Recording Status */}
        {!useManualInput && (
          <Box mt={2} display="flex" alignItems="center" justifyContent="center">
            {isListening ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: 'error.main',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
                <Typography variant="body2" color="error">
                  Recording in progress...
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {speechSupported ? 'Voice recording paused' : 'Voice not available - using manual input'}
              </Typography>
            )}
          </Box>
        )}

        {/* Auto-submit warning */}
        {timeRemaining <= 10 && timeRemaining > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ⚠️ Time is running out! Your answer will be automatically submitted in {timeRemaining} seconds.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterviewComponent;