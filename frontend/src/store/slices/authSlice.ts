import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Interviewer, LoginCredentials, RegisterData, AuthToken } from '../../types';
import api from '../../services/api';

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
    const response = await api.post<AuthToken>('/auth/login', credentials);
    return response.data;
  }
);

export const registerInterviewer = createAsyncThunk(
  'auth/register',
  async (registerData: RegisterData) => {
    const response = await api.post<Interviewer>('/auth/register', registerData);
    return response.data;
  }
);

export const createInterviewSession = createAsyncThunk(
  'auth/createSession',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const response = await api.post('/auth/create-session', {}, {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    });
    return response.data;
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
        state.error = null;
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