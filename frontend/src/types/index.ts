export interface Interviewer {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  company?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface InterviewSession {
  id: number;
  session_token: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  resume_url?: string;
  status: 'created' | 'in_progress' | 'completed' | 'abandoned';
  current_question_index: number;
  total_score: number;
  ai_summary?: string;
  student_ai_summary?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface InterviewQuestion {
  id: number;
  question_number: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  time_limit: number;
  generated_at: string;
}

export interface InterviewAnswer {
  id: number;
  answer_text?: string;
  time_taken?: number;
  score?: number;
  ai_feedback?: string;
  submitted_at: string;
  question: InterviewQuestion;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'assistant';
  message: string;
  message_type: 'text' | 'system' | 'question' | 'answer';
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface CandidateInfo {
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
}

export interface ResumeUploadResponse {
  filename: string;
  extracted_data: {
    name?: string;
    email?: string;
    phone?: string;
    skills: string[];
    experience_years: number;
    education?: string;
    summary: string;
    missing_fields: string[];
  };
  missing_fields: string[];
}

export interface CandidateListItem {
  id: number;
  session_token: string;
  candidate_name?: string;
  candidate_email?: string;
  status: InterviewSession['status'];
  total_score: number;
  created_at: string;
  completed_at?: string;
}

export interface CandidateDetails extends InterviewSession {
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  chat_history: ChatMessage[];
}

export interface DashboardStats {
  total_sessions: number;
  completed_sessions: number;
  in_progress_sessions: number;
  average_score: number;
  completion_rate: number;
}

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  session_token: string;
}