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
  onAnswer,
  isActive = false,
  error: externalError,
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStarted = useRef(false);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition();

  // Auto-submit when time expires
  useEffect(() => {
    if (timeRemaining <= 0 && !autoSubmitTriggered.current) {
      autoSubmitTriggered.current = true;
      stopListening();
      
      const finalAnswer = (currentAnswer + ' ' + interimTranscript).trim() || 
        '[No answer provided - time expired]';
      
      onAnswerSubmit(finalAnswer);
      onTimeExpired();
    }
  }, [timeRemaining, currentAnswer, interimTranscript, onAnswerSubmit, onTimeExpired, stopListening]);

  // Auto-start voice recording when component mounts (when timer starts)
  useEffect(() => {
    if (speechSupported && !hasStarted && timeRemaining > 0) {
      setHasStarted(true);
      setIsAutoListening(true);
      // Small delay to ensure component is ready
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [speechSupported, hasStarted, timeRemaining, startListening]);

  const handleToggleListening = () => {
    if (isListening) {
      setIsAutoListening(false);
      stopListening();
    } else {
      setIsAutoListening(true);
      startListening();
    }
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

  const combinedTranscript = currentAnswer + (interimTranscript ? ' ' + interimTranscript : '');
  const progress = ((totalTime - timeRemaining) / totalTime) * 100;

  if (!speechSupported) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        ❌ Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Question Header */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Question {question.question_number}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={question.difficulty.toUpperCase()}
                color={getDifficultyColor(question.difficulty) as any}
                variant="filled"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerIcon />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {formatTime(timeRemaining)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {question.question}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: timeRemaining > totalTime * 0.3 ? '#4caf50' : timeRemaining > totalTime * 0.1 ? '#ff9800' : '#f44336'
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Voice Recording Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isListening ? (
                <>
                  <MicIcon color="error" />
                  🎤 Recording...
                </>
              ) : (
                <>
                  <MicOffIcon color="disabled" />
                  🔇 Not Recording
                </>
              )}
            </Typography>
            <Box 
              sx={{ 
                cursor: 'pointer',
                p: 1,
                borderRadius: 1,
                bgcolor: isListening ? 'error.light' : 'action.hover',
                '&:hover': { bgcolor: isListening ? 'error.main' : 'action.selected' }
              }}
              onClick={handleToggleListening}
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
            </Box>
          </Box>
          
          {speechError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              ⚠️ Speech recognition error: {speechError}. Trying to restart...
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            💭 Live Transcript:
          </Typography>
        </CardContent>
      </Card>

      {/* Live Transcript */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          minHeight: 200,
          maxHeight: 300,
          overflowY: 'auto',
          bgcolor: 'grey.50',
          border: '2px dashed',
          borderColor: isListening ? 'error.main' : 'grey.300',
          transition: 'border-color 0.3s ease'
        }}
      >
        {combinedTranscript ? (
          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.8,
              fontSize: '1.1rem',
              color: 'text.primary'
            }}
          >
            {combinedTranscript}
            {interimTranscript && (
              <span style={{ opacity: 0.6, fontStyle: 'italic' }}>
                {' ' + interimTranscript}
              </span>
            )}
          </Typography>
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontStyle: 'italic',
              textAlign: 'center',
              mt: 4
            }}
          >
            {isListening ? 
              '🎤 Listening... Start speaking to see your words appear here.' :
              '🔇 Click the microphone to start recording your answer.'
            }
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default VoiceInterviewComponent;