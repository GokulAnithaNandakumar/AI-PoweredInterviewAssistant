from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class SessionStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"

class MessageType(str, Enum):
    TEXT = "text"
    SYSTEM = "system"
    QUESTION = "question"
    ANSWER = "answer"

class MessageSender(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

# Interviewer Schemas
class InterviewerBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class InterviewerCreate(InterviewerBase):
    password: str

class InterviewerLogin(BaseModel):
    username: str
    password: str

class InterviewerResponse(InterviewerBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Interview Session Schemas
class InterviewSessionCreate(BaseModel):
    pass  # Will be created by interviewer

class InterviewSessionResponse(BaseModel):
    id: int
    session_token: str
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    candidate_phone: Optional[str]
    status: SessionStatus
    current_question_index: int
    total_score: float
    ai_summary: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Candidate Info Update
class CandidateInfoUpdate(BaseModel):
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None

# Question Schemas
class InterviewQuestionResponse(BaseModel):
    id: int
    question_number: int
    difficulty: DifficultyLevel
    question_text: str
    time_limit: int
    generated_at: datetime
    
    class Config:
        from_attributes = True

# Answer Schemas
class InterviewAnswerSubmit(BaseModel):
    answer_text: Optional[str] = None
    time_taken: Optional[int] = None

class InterviewAnswerResponse(BaseModel):
    id: int
    answer_text: Optional[str]
    time_taken: Optional[int]
    score: Optional[float]
    ai_feedback: Optional[str]
    submitted_at: datetime
    question: InterviewQuestionResponse
    
    class Config:
        from_attributes = True

# Chat Message Schemas
class ChatMessageCreate(BaseModel):
    message: str
    sender: MessageSender
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None

class ChatMessageResponse(BaseModel):
    id: int
    sender: MessageSender
    message: str
    message_type: MessageType
    metadata: Optional[Dict[str, Any]]
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Resume Upload
class ResumeUploadResponse(BaseModel):
    filename: str
    extracted_data: Dict[str, Any]
    missing_fields: List[str]

# Dashboard Schemas
class CandidateListItem(BaseModel):
    id: int
    session_token: str
    candidate_name: Optional[str]
    candidate_email: Optional[str]
    status: SessionStatus
    total_score: float
    created_at: datetime
    completed_at: Optional[datetime]

class CandidateDetails(InterviewSessionResponse):
    questions: List[InterviewQuestionResponse]
    answers: List[InterviewAnswerResponse]
    chat_history: List[ChatMessageResponse]

# WebSocket Schemas
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    session_token: str

# Error Schemas
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None