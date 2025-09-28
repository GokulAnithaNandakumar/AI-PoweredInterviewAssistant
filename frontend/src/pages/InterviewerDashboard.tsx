import React, { useState, useEffect } from 'react';
import type { InterviewQuestion, InterviewAnswer, ChatMessage } from '../types';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { authAPI, dashboardAPI } from '../services/api';

interface InterviewSession {
  id: number;
  session_token: string;
  candidate_email: string;
  candidate_name: string | null;
  candidate_phone: string | null;
  resume_url: string | null;
  resume_filename: string | null;
  status: 'created' | 'in_progress' | 'completed' | 'abandoned' | 'max_retries_reached';
  current_question_index: number;
  total_score: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  ai_summary: string | null;
}

interface DashboardStats {
  total_interviews: number;
  completed_interviews: number;
  in_progress_interviews: number;
  avg_score: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

interface CandidateDetails {
  id: number;
  session_token: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  resume_url?: string;
  resume_filename?: string;
  status: 'created' | 'in_progress' | 'completed' | 'abandoned' | 'max_retries_reached';
  current_question_index: number;
  total_score: number;
  ai_summary?: string;
  student_ai_summary?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  retry_count?: number;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  chat_history: ChatMessage[];
}

const MAX_RETRIES = 2;

const InterviewerDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  // Candidate detail modal state
  const [candidateDetailOpen, setCandidateDetailOpen] = useState(false);
  const [candidateDetail, setCandidateDetail] = useState<CandidateDetails | null>(null);
  const [candidateDetailLoading, setCandidateDetailLoading] = useState(false);
  // Open candidate detail modal
  const openCandidateDetail = async (sessionId: number) => {
    setCandidateDetailLoading(true);
    setCandidateDetailOpen(true);
    try {
      const details = await dashboardAPI.getSessionDetails(sessionId);
      setCandidateDetail(details);
    } catch {
      setError('Failed to load candidate details');
      setCandidateDetailOpen(false);
    } finally {
      setCandidateDetailLoading(false);
    }
  };
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_interviews: 0,
    completed_interviews: 0,
    in_progress_interviews: 0,
    avg_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create session dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSessionData, setCreateSessionData] = useState({
    candidate_email: '',
    candidate_name: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Table pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionsData, statsData] = await Promise.all([
        dashboardAPI.getSessions(),
        dashboardAPI.getStats()
      ]);

      setSessions(sessionsData);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateSession = async () => {
    if (!createSessionData.candidate_email) {
      setError('Please enter candidate email');
      return;
    }

    setCreateLoading(true);
    try {
      await authAPI.createSession({
        candidate_email: createSessionData.candidate_email,
        candidate_name: createSessionData.candidate_name || undefined
      });

      setSuccess(`Interview created successfully! Link sent to ${createSessionData.candidate_email}`);
      setCreateDialogOpen(false);
      setCreateSessionData({ candidate_email: '', candidate_name: '' });

      // Refresh dashboard data
      await loadDashboardData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const copyInterviewLink = (sessionToken: string) => {
    const link = `${window.location.origin}/interview/${sessionToken}`;
    navigator.clipboard.writeText(link);
    setSuccess('Interview link copied to clipboard!');
  };

  const deleteSession = async (sessionId: number) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await dashboardAPI.deleteSession(sessionId);
        setSuccess('Session deleted successfully');
        await loadDashboardData();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
        setError(errorMessage);
      }
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'created': return 'info';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'abandoned': return 'error';
      case 'max_retries_reached': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && sessions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🎯 AI Interview Assistant
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user.full_name || user.username}
          </Typography>
          <IconButton color="inherit" onClick={loadDashboardData} title="Refresh">
            <RefreshIcon />
          </IconButton>
          <IconButton color="inherit" onClick={onLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4
        }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats.total_interviews}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Interviews
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats.completed_interviews}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats.in_progress_interviews}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 40, color: stats.avg_score >= 70 ? 'success.main' : 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" component="div">
                    {stats.avg_score}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Sessions Table */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="div">
              Interview Sessions
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create New Interview
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Candidate</TableCell>
                  <TableCell>Resume</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((session) => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {session.candidate_name || 'Not provided'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.candidate_email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {session.resume_url ? (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DescriptionIcon />}
                            endIcon={<OpenInNewIcon />}
                            href={session.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Resume
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No resume
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.status === 'max_retries_reached' ? 'MAXIMUM RETRIES REACHED' : session.status.toUpperCase()}
                          color={getStatusColor(session.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {session.total_score !== null && session.total_score !== undefined ? `${session.total_score}%` : '-'}
                      </TableCell>
                      <TableCell>{formatDate(session.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => copyInterviewLink(session.session_token)}
                            title="Copy interview link"
                          >
                            <CopyIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openCandidateDetail(session.id)}
                            title="View details"
                            color="primary"
                          >
                            <AssessmentIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => deleteSession(session.id)}
                            title="Delete session"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
        {/* Candidate Detail Modal */}
        <Dialog open={candidateDetailOpen} onClose={() => setCandidateDetailOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Candidate Details</DialogTitle>
          <DialogContent dividers>
            {candidateDetailLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress />
              </Box>
            ) : candidateDetail ? (
              <Box>
                <Typography variant="h6" gutterBottom>Profile</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography>Name: {candidateDetail.candidate_name?.trim() ? candidateDetail.candidate_name : 'Not provided'}</Typography>
                  <Typography>Email: {candidateDetail.candidate_email?.trim() ? candidateDetail.candidate_email : 'Not provided'}</Typography>
                  <Typography>Phone: {candidateDetail.candidate_phone?.trim() ? candidateDetail.candidate_phone : 'Not provided'}</Typography>
                  <Typography>Resume: {candidateDetail.resume_url ? (
                    <a href={candidateDetail.resume_url} target="_blank" rel="noopener noreferrer">View Resume</a>
                  ) : 'Not provided'}</Typography>
                  <Typography>Status: {candidateDetail.status === 'max_retries_reached' ? 'Maximum Retries Reached' : candidateDetail.status ? candidateDetail.status.toUpperCase() : 'Not provided'}</Typography>
                  <Typography>Retry/Continue Count: {candidateDetail.retry_count ?? 0} / {MAX_RETRIES}</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>Interview Questions & Answers</Typography>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Question</TableCell>
                        <TableCell>Difficulty</TableCell>
                        <TableCell>Answer</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>AI Feedback</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidateDetail.questions.map((q) => {
                        const answer = candidateDetail.answers.find(a => {
                          // Support both a.question?.id and a.question_id
                          if (a.question && typeof a.question.id !== 'undefined') {
                            return a.question.id === q.id;
                          }
                          if ('question_id' in a) {
                            return a.question_id === q.id;
                          }
                          return false;
                        });
                        return (
                          <TableRow key={q.id}>
                            <TableCell>{q.question_number}</TableCell>
                            <TableCell>{q.question_text}</TableCell>
                            <TableCell>{q.difficulty}</TableCell>
                            <TableCell>{answer?.answer_text || <i>Not answered</i>}</TableCell>
                            <TableCell>{answer?.score !== undefined ? answer.score : '-'}</TableCell>
                            <TableCell>{answer?.ai_feedback || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="h6" gutterBottom>AI Summary</Typography>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography>{candidateDetail.ai_summary || 'No summary available.'}</Typography>
                </Paper>
                <Typography variant="h6" gutterBottom>Chat History</Typography>
                <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                  {candidateDetail.chat_history && candidateDetail.chat_history.length > 0 ? (
                    candidateDetail.chat_history.map((msg, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">[{msg.timestamp}] {msg.sender} ({msg.message_type})</Typography>
                        <Typography>{msg.message}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography>No chat history.</Typography>
                  )}
                </Paper>
              </Box>
            ) : (
              <Typography>No candidate details found.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCandidateDetailOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No interview sessions yet. Create your first interview!
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sessions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

        {/* Create Session Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 1 }} />
              Create New Interview
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              An interview link will be automatically sent to the candidate's email address.
            </Alert>

            <TextField
              autoFocus
              margin="dense"
              label="Candidate Email"
              type="email"
              fullWidth
              variant="outlined"
              required
              value={createSessionData.candidate_email}
              onChange={(e) => setCreateSessionData({ ...createSessionData, candidate_email: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Candidate Name (Optional)"
              type="text"
              fullWidth
              variant="outlined"
              value={createSessionData.candidate_name}
              onChange={(e) => setCreateSessionData({ ...createSessionData, candidate_name: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateSession}
              variant="contained"
              disabled={createLoading}
              startIcon={createLoading ? <CircularProgress size={20} /> : <EmailIcon />}
            >
              {createLoading ? 'Creating...' : 'Create & Send Invitation'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default InterviewerDashboard;