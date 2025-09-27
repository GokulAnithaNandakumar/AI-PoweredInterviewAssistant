import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { store, persistor } from './store';
import type { RootState } from './store';
import { logout } from './store/slices/authSlice';
import { authAPI } from './services/api';
import AuthPage from './pages/AuthPage';
import InterviewerDashboard from './pages/InterviewerDashboard';
import CandidateInterviewPage from './pages/CandidateInterviewPage';

// Create a modern theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#9fa8ef',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#764ba2',
      light: '#a478cc',
      dark: '#5a3581',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '3.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
});

const LoadingScreen = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}
  >
    <CircularProgress size={60} sx={{ color: 'white' }} />
  </Box>
);

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Get auth state from Redux
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Check if current path is an interview link
  const isInterviewPage = location.pathname.startsWith('/interview/');

  useEffect(() => {
    // If it's an interview page, don't check for authentication
    if (isInterviewPage) {
      setLoading(false);
      return;
    }

    // Check if user is already authenticated from Redux store
    if (isAuthenticated && token) {
      // Validate token and get user info
      authAPI.getCurrentUser()
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          // Token is invalid, clear Redux state
          dispatch(logout());
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isInterviewPage, isAuthenticated, token, dispatch]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    dispatch(logout());
    setUser(null);
    navigate('/auth');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      width: '100vw',
      overflow: 'auto'
    }}>
      <Routes>
        <Route path="/interview/:sessionToken" element={<CandidateInterviewPage />} />
        <Route
          path="/auth"
          element={user ? <Navigate to="/dashboard" replace /> : <AuthPage onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <InterviewerDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Box>
  );
}

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;
