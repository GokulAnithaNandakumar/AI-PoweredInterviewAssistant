import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  CandidateListItem,
  CandidateDetails,
  DashboardStats
} from '../../types';
import api from '../../services/api';

interface DashboardState {
  candidates: CandidateListItem[];
  selectedCandidate: CandidateDetails | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  candidates: [],
  selectedCandidate: null,
  stats: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchCandidates = createAsyncThunk(
  'dashboard/fetchCandidates',
  async (_, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await api.get<CandidateListItem[]>('/dashboard/sessions', {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    });
    return response.data;
  }
);

export const fetchCandidateDetails = createAsyncThunk(
  'dashboard/fetchCandidateDetails',
  async (sessionId: number, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await api.get<CandidateDetails>(`/dashboard/session/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    });
    return response.data;
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { getState }) => {
    const state = getState() as { auth: { token: string } };
    const response = await api.get<DashboardStats>('/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
      },
    });
    return response.data;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedCandidate: (state) => {
      state.selectedCandidate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch candidates
      .addCase(fetchCandidates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.candidates = action.payload;
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch candidates';
      })
      // Fetch candidate details
      .addCase(fetchCandidateDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCandidateDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCandidate = action.payload;
      })
      .addCase(fetchCandidateDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch candidate details';
      })
      // Fetch stats
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearError, clearSelectedCandidate } = dashboardSlice.actions;
export default dashboardSlice.reducer;