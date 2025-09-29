// Interviewee chat API
export const interviewAPI = {
  addChatMessage: async (sessionToken: string, message: {
    sender: 'user' | 'assistant',
    message: string,
    message_type?: string,
    message_metadata?: Record<string, unknown>
  }) => {
    const response = await api.post(`/interview/${sessionToken}/chat`, message);
    return response.data;
  }
};
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (credentials: { username: string; password: string }) => {
    const response = await api.post('/auth/login', {
      email: credentials.username, // Backend expects 'email' field
      password: credentials.password
    });
    return response.data;
  },

  register: async (userData: { username: string; email: string; password: string; full_name?: string }) => {
    const response = await api.post('/auth/register', {
      email: userData.email,
      name: userData.full_name || userData.username,
      password: userData.password
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  createSession: async (sessionData: { candidate_email: string; candidate_name?: string; role: string }) => {
    const response = await api.post('/auth/create-session', sessionData);
    return response.data;
  }
};

// Dashboard API calls
export const dashboardAPI = {
  getSessions: async () => {
    const response = await api.get('/dashboard/sessions');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  deleteSession: async (sessionId: number) => {
    const response = await api.delete(`/dashboard/sessions/${sessionId}`);
    return response.data;
  },

  getSessionDetails: async (sessionId: number) => {
    const response = await api.get(`/dashboard/sessions/${sessionId}/details`);
    return response.data;
  }
};

export default api;