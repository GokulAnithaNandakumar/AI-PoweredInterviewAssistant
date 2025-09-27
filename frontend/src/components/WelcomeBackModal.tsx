import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  WavingHand as WelcomeIcon,
  Timer as TimerIcon,
  QuestionAnswer as QuestionIcon,
  Assessment as ScoreIcon,
} from '@mui/icons-material';

interface InterviewProgress {
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  totalTime: number;
  candidateName?: string;
  candidateEmail?: string;
  phase: string;
  answeredQuestions: number;
}

interface WelcomeBackModalProps {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  progress: InterviewProgress;
  sessionToken: string;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  open,
  onResume,
  onRestart,
  progress,
  sessionToken,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [autoResuming, setAutoResuming] = useState(false);

  // Auto-resume countdown
  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setAutoResuming(true);
          setTimeout(() => {
            onResume();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onResume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    // Handle edge cases to prevent Infinity%
    if (!progress.totalQuestions || progress.totalQuestions <= 0) {
      return 0;
    }

    const answeredCount = Math.max(0, progress.answeredQuestions || 0);
    const totalCount = Math.max(1, progress.totalQuestions || 1);

    const percentage = (answeredCount / totalCount) * 100;

    // Ensure percentage is within valid range
    if (!isFinite(percentage) || isNaN(percentage)) {
      return 0;
    }

    return Math.min(100, Math.max(0, percentage));
  };

  const getSafeProgressNumbers = () => {
    const answered = Math.max(0, progress.answeredQuestions || 0);
    const total = Math.max(1, progress.totalQuestions || 1);
    const remaining = Math.max(0, progress.timeRemaining || 0);

    return { answered, total, remaining };
  };

  const getPhaseDisplay = () => {
    switch (progress.phase) {
      case 'profile':
        return { label: 'Profile Setup', color: 'info' as const };
      case 'interview':
        return { label: 'Interview In Progress', color: 'primary' as const };
      case 'completed':
        return { label: 'Completed', color: 'success' as const };
      default:
        return { label: 'Unknown', color: 'default' as const };
    }
  };

  const phaseInfo = getPhaseDisplay();

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WelcomeIcon sx={{ fontSize: 32, color: '#ffd700' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Welcome Back! 👋
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Your interview session is ready to continue
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Card sx={{ mb: 3, bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              📋 Interview Progress
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                  Status
                </Typography>
                <Chip
                  label={phaseInfo.label}
                  color={phaseInfo.color}
                  variant="filled"
                  sx={{ color: 'white' }}
                />
              </Box>

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                  Session ID
                </Typography>
                <Typography variant="body2" sx={{
                  fontFamily: 'monospace',
                  bgcolor: 'rgba(0,0,0,0.2)',
                  p: 0.5,
                  borderRadius: 1,
                  fontSize: '0.8rem'
                }}>
                  {sessionToken}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <QuestionIcon sx={{ fontSize: 32, mb: 1, color: '#4caf50' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {getSafeProgressNumbers().answered}/{getSafeProgressNumbers().total}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Questions Answered
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <TimerIcon sx={{ fontSize: 32, mb: 1, color: '#ff9800' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {formatTime(getSafeProgressNumbers().remaining)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Time Remaining
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <ScoreIcon sx={{ fontSize: 32, mb: 1, color: '#2196f3' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {Math.round(getProgressPercentage())}%
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Progress
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                Overall Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#4caf50',
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Auto-resume countdown */}
        <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {autoResuming ? (
                <>
                  🚀 <strong>Resuming your interview...</strong>
                </>
              ) : (
                <>
                  ⏰ Auto-resuming in <strong>{countdown}</strong> seconds
                </>
              )}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              You can also choose to resume manually or restart completely
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={onRestart}
          variant="outlined"
          disabled={autoResuming}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          🔄 Start Over
        </Button>
        <Button
          onClick={onResume}
          variant="contained"
          disabled={autoResuming}
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.3)'
            },
            '&:disabled': {
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          {autoResuming ? '🔄 Resuming...' : '▶️ Continue Interview'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WelcomeBackModal;