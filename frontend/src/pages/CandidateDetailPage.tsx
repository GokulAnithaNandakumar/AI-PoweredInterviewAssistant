import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  AppBar,
  Toolbar,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Assessment as ScoreIcon,
  QuestionAnswer as QuestionIcon,
  Timer as TimerIcon,
  Description as ResumeIcon,
  School as EducationIcon,
  Work as ExperienceIcon,
  Code as SkillsIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';

interface CandidateDetails {
  id: number;
  session_token: string;
  candidate_email: string;
  candidate_name: string | null;
  candidate_phone: string | null;
  resume_url: string | null;
  status: string;
  total_score: number | null;
  created_at: string;
  completed_at: string | null;
  candidate_info: {
    name?: string;
    email?: string;
    phone?: string;
    experience?: string;
    skills?: string[];
    education?: string;
    projects?: string;
  };
  questions: Array<{
    id: number;
    question: string;
    difficulty: string;
    category: string;
    time_limit: number;
    question_number: number;
    answer?: string;
    score?: number;
    ai_feedback?: string;
    answer_time?: number;
    created_at: string;
  }>;
  ai_summary?: string;
  chat_history: Array<{
    type: string;
    content: string;
    timestamp: string;
    questionData?: any;
  }>;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`candidate-tabpanel-${index}`}
      aria-labelledby={`candidate-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const CandidateDetailPage: React.FC = () => {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const loadCandidateDetails = async () => {
      if (!sessionToken) return;

      try {
        setLoading(true);
        const data = await dashboardAPI.getCandidate(sessionToken);
        setCandidate(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load candidate details');
        console.error('Failed to load candidate details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCandidateDetails();
  }, [sessionToken]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'not_started': return 'info';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading candidate details...</Typography>
      </Container>
    );
  }

  if (error || !candidate) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Candidate not found'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/dashboard')}
          startIcon={<BackIcon />}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              {candidate.candidate_name || 'Unnamed Candidate'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Session: {candidate.session_token}
            </Typography>
          </Box>
          <Chip
            label={candidate.status.toUpperCase()}
            color={getStatusColor(candidate.status)}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header Card */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <PersonIcon sx={{ fontSize: 40 }} />
                </Avatar>
              </Grid>
              <Grid item xs>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {candidate.candidate_name || 'Unnamed Candidate'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16 }} />
                    <Typography variant="body2">{candidate.candidate_email}</Typography>
                  </Box>
                  {candidate.candidate_phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{candidate.candidate_phone}</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body1">
                    📅 Started: {formatDate(candidate.created_at)}
                  </Typography>
                  {candidate.completed_at && (
                    <Typography variant="body1">
                      ✅ Completed: {formatDate(candidate.completed_at)}
                    </Typography>
                  )}
                </Box>
              </Grid>
              {candidate.total_score !== null && (
                <Grid item>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {candidate.total_score}%
                    </Typography>
                    <Typography variant="body1">Overall Score</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<PersonIcon />} label="Profile" />
            <Tab icon={<QuestionIcon />} label={`Questions (${candidate.questions.length})`} />
            <Tab icon={<ChatIcon />} label="Chat History" />
            <Tab icon={<AIIcon />} label="AI Summary" />
          </Tabs>
        </Paper>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon />
                    Basic Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><EmailIcon /></ListItemIcon>
                      <ListItemText
                        primary="Email"
                        secondary={candidate.candidate_email}
                      />
                    </ListItem>
                    {candidate.candidate_phone && (
                      <ListItem>
                        <ListItemIcon><PhoneIcon /></ListItemIcon>
                        <ListItemText
                          primary="Phone"
                          secondary={candidate.candidate_phone}
                        />
                      </ListItem>
                    )}
                    {candidate.candidate_info?.experience && (
                      <ListItem>
                        <ListItemIcon><ExperienceIcon /></ListItemIcon>
                        <ListItemText
                          primary="Experience"
                          secondary={candidate.candidate_info.experience}
                        />
                      </ListItem>
                    )}
                    {candidate.candidate_info?.education && (
                      <ListItem>
                        <ListItemIcon><EducationIcon /></ListItemIcon>
                        <ListItemText
                          primary="Education"
                          secondary={candidate.candidate_info.education}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SkillsIcon />
                    Skills & Projects
                  </Typography>
                  {candidate.candidate_info?.skills && candidate.candidate_info.skills.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Skills:</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {candidate.candidate_info.skills.map((skill, index) => (
                          <Chip key={index} label={skill} size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {candidate.candidate_info?.projects && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Projects:</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {candidate.candidate_info.projects}
                      </Typography>
                    </Box>
                  )}
                  {candidate.resume_url && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<ResumeIcon />}
                        href={candidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        fullWidth
                      >
                        View Resume
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Questions Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box>
            {candidate.questions.length === 0 ? (
              <Alert severity="info">No questions answered yet.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {candidate.questions.map((question, index) => (
                  <Accordion key={question.id} defaultExpanded={index === 0}>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="h6">
                          Question {question.question_number}
                        </Typography>
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
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                          {question.score !== null && question.score !== undefined && (
                            <Chip
                              label={`${question.score}%`}
                              color={getScoreColor(question.score)}
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                          {question.answer_time && (
                            <Typography variant="caption" color="text.secondary">
                              ⏱️ {formatTime(question.answer_time)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                          📝 Question:
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                          {question.question}
                        </Typography>

                        {question.answer && (
                          <>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                              💭 Candidate's Answer:
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 3, p: 2, bgcolor: 'blue.50', borderRadius: 2, whiteSpace: 'pre-line' }}>
                              {question.answer}
                            </Typography>
                          </>
                        )}

                        {question.ai_feedback && (
                          <>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AIIcon />
                              AI Feedback:
                            </Typography>
                            <Typography variant="body1" sx={{ p: 2, bgcolor: 'green.50', borderRadius: 2, whiteSpace: 'pre-line' }}>
                              {question.ai_feedback}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Chat History Tab */}
        <TabPanel value={activeTab} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                💬 Interview Chat History
              </Typography>
              {candidate.chat_history.length === 0 ? (
                <Alert severity="info">No chat history available.</Alert>
              ) : (
                <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                  {candidate.chat_history.map((message, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: message.type === 'user' ? 'blue.50' : 'grey.100'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={message.type.toUpperCase()}
                          size="small"
                          color={message.type === 'user' ? 'primary' : 'default'}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(message.timestamp)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {message.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* AI Summary Tab */}
        <TabPanel value={activeTab} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AIIcon />
                AI Interview Summary
              </Typography>
              {candidate.ai_summary ? (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                  {candidate.ai_summary}
                </Typography>
              ) : (
                <Alert severity="info">
                  AI summary will be available after the interview is completed.
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default CandidateDetailPage;