import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  InterviewSession,
  InterviewQuestion,
  InterviewAnswer,
  ChatMessage,
  CandidateInfo,
  ResumeUploadResponse
} from '../../types';
import api from '../../services/api';

interface InterviewState {
  currentSession: InterviewSession | null;
  currentQuestion: InterviewQuestion | null;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  timeRemaining: number;
  isTimerRunning: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  missingFields: string[];
  resumeData: ResumeUploadResponse | null;
}

const initialState: InterviewState = {
  currentSession: null,
  currentQuestion: null,
  questions: [],
  answers: [],
  chatHistory: [],
  isLoading: false,
  error: null,
  timeRemaining: 0,
  isTimerRunning: false,
  hasStarted: false,
  isCompleted: false,
  missingFields: [],
  resumeData: null,
};

// Async thunks
export const getSessionInfo = createAsyncThunk(
  'interview/getSessionInfo',
  async (sessionToken: string) => {
    const response = await api.get<InterviewSession>(`/interview/${sessionToken}/info`);
    return response.data;
  }
);

export const uploadResume = createAsyncThunk(
  'interview/uploadResume',
  async ({ sessionToken, file }: { sessionToken: string; file: File }) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ResumeUploadResponse>(
      `/interview/${sessionToken}/upload-resume`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
);

export const updateCandidateInfo = createAsyncThunk(
  'interview/updateCandidateInfo',
  async ({ sessionToken, candidateInfo }: { sessionToken: string; candidateInfo: CandidateInfo }) => {
    const response = await api.put(`/interview/${sessionToken}/candidate-info`, candidateInfo);
    return { candidateInfo, response: response.data };
  }
);

export const startInterview = createAsyncThunk(
  'interview/startInterview',
  async (sessionToken: string) => {
    const response = await api.post(`/interview/${sessionToken}/start-interview`);
    return response.data;
  }
);

export const submitAnswer = createAsyncThunk(
  'interview/submitAnswer',
  async ({
    sessionToken,
    questionId,
    answerText,
    timeTaken
  }: {
    sessionToken: string;
    questionId: number;
    answerText?: string;
    timeTaken?: number;
  }) => {
    const response = await api.post(`/interview/${sessionToken}/submit-answer?question_id=${questionId}`, {
      answer_text: answerText,
      time_taken: timeTaken,
    });
    return response.data;
  }
);

export const addChatMessage = createAsyncThunk(
  'interview/addChatMessage',
  async ({
    sessionToken,
    message,
    sender,
    messageType
  }: {
    sessionToken: string;
    message: string;
    sender: 'user' | 'assistant';
    messageType?: 'text' | 'system' | 'question' | 'answer';
  }) => {
    await api.post(`/interview/${sessionToken}/chat`, {
      message,
      sender,
      message_type: messageType || 'text',
    });
    return { message, sender, messageType, timestamp: new Date().toISOString() };
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetInterview: () => {
      return { ...initialState };
    },
    setTimeRemaining: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload;
    },
    startTimer: (state) => {
      state.isTimerRunning = true;
    },
    stopTimer: (state) => {
      state.isTimerRunning = false;
    },
    decrementTime: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      } else {
        state.isTimerRunning = false;
      }
    },
    addChatMessageLocal: (state, action: PayloadAction<Omit<ChatMessage, 'id'>>) => {
      const newMessage = {
        ...action.payload,
        id: Date.now(), // Temporary ID
      };
      state.chatHistory.push(newMessage);
    },
    setCurrentQuestion: (state, action: PayloadAction<InterviewQuestion>) => {
      state.currentQuestion = action.payload;
      state.timeRemaining = action.payload.time_limit;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get session info
      .addCase(getSessionInfo.fulfilled, (state, action) => {
        state.currentSession = action.payload;
        state.hasStarted = action.payload.status === 'in_progress';
        state.isCompleted = action.payload.status === 'completed';
      })
      // Upload resume
      .addCase(uploadResume.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.isLoading = false;
        state.resumeData = action.payload;
        state.missingFields = action.payload.missing_fields;
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Resume upload failed';
      })
      // Update candidate info
      .addCase(updateCandidateInfo.fulfilled, (state, action) => {
        if (state.currentSession) {
          state.currentSession = {
            ...state.currentSession,
            ...action.payload.candidateInfo
          };
        }
        // Update missing fields
        const info = action.payload.candidateInfo;
        state.missingFields = state.missingFields.filter(field => {
          if (field === 'name' && info.candidate_name) return false;
          if (field === 'email' && info.candidate_email) return false;
          if (field === 'phone' && info.candidate_phone) return false;
          return true;
        });
      })
      // Start interview
      .addCase(startInterview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startInterview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasStarted = true;
        if (action.payload.question) {
          state.currentQuestion = action.payload.question;
          state.timeRemaining = action.payload.question.time_limit;
          state.isTimerRunning = true;
        }
      })
      .addCase(startInterview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start interview';
      })
      // Submit answer
      .addCase(submitAnswer.pending, (state) => {
        state.isLoading = true;
        state.isTimerRunning = false;
      })
      .addCase(submitAnswer.fulfilled, (state, action) => {
        state.isLoading = false;

        if (action.payload.interview_completed) {
          state.isCompleted = true;
          state.currentQuestion = null;
          if (state.currentSession) {
            state.currentSession.total_score = action.payload.total_score;
            state.currentSession.ai_summary = action.payload.summary;
          }
        } else if (action.payload.next_question) {
          state.currentQuestion = action.payload.next_question;
          state.timeRemaining = action.payload.next_question.time_limit;
          state.isTimerRunning = true;
        }
      })
      .addCase(submitAnswer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to submit answer';
      })
      // Add chat message
      .addCase(addChatMessage.fulfilled, (state, action) => {
        const newMessage = {
          id: Date.now(),
          sender: action.payload.sender,
          message: action.payload.message,
          message_type: action.payload.messageType || 'text',
          timestamp: action.payload.timestamp,
        };
        state.chatHistory.push(newMessage);
      });
  },
});

export const {
  clearError,
  resetInterview,
  setTimeRemaining,
  startTimer,
  stopTimer,
  decrementTime,
  addChatMessageLocal,
  setCurrentQuestion,
} = interviewSlice.actions;

export default interviewSlice.reducer;