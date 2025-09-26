import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Tab,
  Tabs,
  CircularProgress,
  Divider
} from '@mui/material';
import { Person, Email, Lock, Login, PersonAdd } from '@mui/icons-material';
import { loginInterviewer, registerInterviewer } from '../store/slices/authSlice';
import type { AppDispatch } from '../store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface AuthPageProps {
  onLogin: (user: { id: number; username: string; email: string; full_name?: string }, token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await dispatch(loginInterviewer(loginData));
      // TypeScript workaround for AsyncThunk result type
      if ('payload' in result && result.payload) {
        const response = result.payload as { access_token: string };
        onLogin({ id: 1, username: loginData.email, email: loginData.email, full_name: '' }, response.access_token);
      } else if ('error' in result) {
        setError((result.error as Error)?.message || 'Login failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await dispatch(registerInterviewer({
        email: registerData.email,
        name: registerData.full_name,
        password: registerData.password
      }));

      if ('payload' in result && result.payload) {
        setSuccess('Account created successfully! Please login.');
        setActiveTab(0); // Switch to login tab

        // Clear register form
        setRegisterData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          full_name: ''
        });
      } else if ('error' in result) {
        setError((result.error as Error)?.message || 'Registration failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
                           (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setLoginData({ email: 'admin', password: 'admin' });
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper elevation={8} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
              🎯 AI Interview Assistant
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Professional AI-powered interview management system
            </Typography>
          </Box>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Quick Login Demo */}
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button size="small" onClick={handleQuickLogin} variant="outlined">
                Quick Fill
              </Button>
            }
          >
            Demo Credentials: <strong>username: admin, password: admin</strong>
          </Alert>

          {/* Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mb: 2 }}>
            <Tab icon={<Login />} label="Login" />
            <Tab icon={<PersonAdd />} label="Register" />
          </Tabs>

          <Divider sx={{ mb: 2 }} />

          {/* Login Panel */}
          <TabPanel value={activeTab} index={0}>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Username or Email"
                variant="outlined"
                margin="normal"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                margin="normal"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </form>
          </TabPanel>

          {/* Register Panel */}
          <TabPanel value={activeTab} index={1}>
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                required
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                variant="outlined"
                margin="normal"
                required
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <TextField
                fullWidth
                label="Full Name (Optional)"
                variant="outlined"
                margin="normal"
                value={registerData.full_name}
                onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                margin="normal"
                required
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                variant="outlined"
                margin="normal"
                required
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
            </form>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthPage;