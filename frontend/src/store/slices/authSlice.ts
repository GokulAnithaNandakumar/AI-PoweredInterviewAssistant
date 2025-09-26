import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Interviewer, LoginCredentials, RegisterData } from '../../types';
import { authAPI } from '../../services/api';

interface AuthState {
  interviewer: Interviewer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  interviewer: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginInterviewer = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials) => {
    const response = await authAPI.login({
      username: credentials.email, // Backend expects email as username
      password: credentials.password
    });
    return response;
  }
);

export const registerInterviewer = createAsyncThunk(
  'auth/register',
  async (registerData: RegisterData) => {
    const response = await authAPI.register({
      username: registerData.email,
      email: registerData.email,
      password: registerData.password,
      full_name: registerData.name
    });
    return response;
  }
);

export const createInterviewSession = createAsyncThunk(
  'auth/createSession',
  async (sessionData: { candidate_email: string; candidate_name?: string }) => {
    const response = await authAPI.createSession(sessionData);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.interviewer = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginInterviewer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginInterviewer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
        state.interviewer = action.payload.user;
        state.error = null;
        // Store token in localStorage for API interceptor
        localStorage.setItem('access_token', action.payload.access_token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginInterviewer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
        state.isAuthenticated = false;
        state.token = null;
      })
      // Register
      .addCase(registerInterviewer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerInterviewer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.interviewer = action.payload;
        state.error = null;
      })
      .addCase(registerInterviewer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      });
  },
});

export const { clearError, logout, setToken } = authSlice.actions;
export default authSlice.reducer;