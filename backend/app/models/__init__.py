from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class Interviewer(Base):
    __tablename__ = "interviewers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    interview_sessions = relationship("InterviewSession", back_populates="interviewer")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String, unique=True, index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    interviewer_id = Column(Integer, ForeignKey("interviewers.id"), nullable=False)
    candidate_name = Column(String, nullable=True)
    candidate_email = Column(String, nullable=True)
    candidate_phone = Column(String, nullable=True)
    resume_filename = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)  # Cloudinary URL for the resume
    resume_content = Column(Text, nullable=True)


    # Store all resume parsing results as JSON
    resume_summary = Column(JSON, nullable=True)

    # Role for which the interview is being conducted (e.g., 'Full Stack Developer', 'Data Scientist')
    role = Column(String(128), nullable=True)


    # Interview Status
    status = Column(String, default="created")  # created, in_progress, completed, abandoned
    current_question_index = Column(Integer, default=0)
    total_score = Column(Float, default=0.0)
    ai_summary = Column(Text, nullable=True)
    student_ai_summary = Column(Text, nullable=True)  # AI analysis of student's overall performance
    retry_count = Column(Integer, default=0)  # Track retries/quits/continues

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    interviewer = relationship("Interviewer", back_populates="interview_sessions")
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan")
    answers = relationship("InterviewAnswer", back_populates="session", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_number = Column(Integer, nullable=False)  # 1-6
    difficulty = Column(String, nullable=False)  # easy, medium, hard
    question_text = Column(Text, nullable=False)
    time_limit = Column(Integer, nullable=False)  # seconds
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("InterviewSession", back_populates="questions")
    answer = relationship("InterviewAnswer", back_populates="question", uselist=False)

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("interview_questions.id"), nullable=False)
    answer_text = Column(Text, nullable=True)
    time_taken = Column(Integer, nullable=True)  # seconds
    score = Column(Float, nullable=True)  # 0-10
    ai_feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("InterviewSession", back_populates="answers")
    question = relationship("InterviewQuestion", back_populates="answer")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    session = relationship("InterviewSession", back_populates="chat_messages")
    sender = Column(String, nullable=False)  # 'user' or 'assistant'
    message = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, system, question, answer
    message_metadata = Column(JSON, nullable=True)  # Additional data like timers, scores
    timestamp = Column(DateTime, default=datetime.utcnow)