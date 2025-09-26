from sqlalchemy.orm import Session
from app.models import Interviewer, InterviewSession, InterviewQuestion, InterviewAnswer, ChatMessage
from app.schemas import InterviewerCreate, InterviewerLogin
from app.core.security import get_password_hash, verify_password, create_access_token
from typing import Optional
import uuid

class InterviewerService:
    @staticmethod
    def create_interviewer(db: Session, interviewer: InterviewerCreate) -> Interviewer:
        """Create a new interviewer account."""
        hashed_password = get_password_hash(interviewer.password)
        db_interviewer = Interviewer(
            email=interviewer.email,
            username=interviewer.username,
            full_name=interviewer.full_name,
            hashed_password=hashed_password
        )
        db.add(db_interviewer)
        db.commit()
        db.refresh(db_interviewer)
        return db_interviewer
    
    @staticmethod
    def authenticate_interviewer(db: Session, credentials: InterviewerLogin) -> Optional[Interviewer]:
        """Authenticate interviewer login."""
        interviewer = db.query(Interviewer).filter(
            Interviewer.username == credentials.username
        ).first()
        
        if not interviewer or not verify_password(credentials.password, interviewer.hashed_password):
            return None
        
        return interviewer
    
    @staticmethod
    def get_interviewer_by_username(db: Session, username: str) -> Optional[Interviewer]:
        """Get interviewer by username."""
        return db.query(Interviewer).filter(Interviewer.username == username).first()
    
    @staticmethod
    def create_session_token(db: Session, interviewer_id: int) -> str:
        """Create a new interview session and return the token."""
        session_token = str(uuid.uuid4())
        session = InterviewSession(
            session_token=session_token,
            interviewer_id=interviewer_id,
            status="created"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session_token

class InterviewService:
    @staticmethod
    def get_session_by_token(db: Session, token: str) -> Optional[InterviewSession]:
        """Get interview session by token."""
        return db.query(InterviewSession).filter(InterviewSession.session_token == token).first()
    
    @staticmethod
    def update_candidate_info(db: Session, session_id: int, candidate_info: dict) -> InterviewSession:
        """Update candidate information in session."""
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if session:
            if candidate_info.get('candidate_name'):
                session.candidate_name = candidate_info['candidate_name']
            if candidate_info.get('candidate_email'):
                session.candidate_email = candidate_info['candidate_email']
            if candidate_info.get('candidate_phone'):
                session.candidate_phone = candidate_info['candidate_phone']
            if candidate_info.get('resume_filename'):
                session.resume_filename = candidate_info['resume_filename']
            if candidate_info.get('resume_content'):
                session.resume_content = candidate_info['resume_content']
            
            db.commit()
            db.refresh(session)
        return session
    
    @staticmethod
    def add_question(db: Session, session_id: int, question_data: dict) -> InterviewQuestion:
        """Add a new question to the session."""
        question = InterviewQuestion(
            session_id=session_id,
            question_number=question_data['question_number'],
            difficulty=question_data['difficulty'],
            question_text=question_data['question'],
            time_limit=question_data['time_limit']
        )
        db.add(question)
        db.commit()
        db.refresh(question)
        return question
    
    @staticmethod
    def add_answer(db: Session, session_id: int, question_id: int, answer_data: dict) -> InterviewAnswer:
        """Add an answer to a question."""
        answer = InterviewAnswer(
            session_id=session_id,
            question_id=question_id,
            answer_text=answer_data.get('answer_text'),
            time_taken=answer_data.get('time_taken'),
            score=answer_data.get('score'),
            ai_feedback=answer_data.get('ai_feedback')
        )
        db.add(answer)
        db.commit()
        db.refresh(answer)
        return answer
    
    @staticmethod
    def add_chat_message(db: Session, session_id: int, message_data: dict) -> ChatMessage:
        """Add a chat message to the session."""
        message = ChatMessage(
            session_id=session_id,
            sender=message_data['sender'],
            message=message_data['message'],
            message_type=message_data.get('message_type', 'text'),
            metadata=message_data.get('metadata')
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def update_session_status(db: Session, session_id: int, status: str, **kwargs) -> InterviewSession:
        """Update session status and related fields."""
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if session:
            session.status = status
            for key, value in kwargs.items():
                if hasattr(session, key):
                    setattr(session, key, value)
            db.commit()
            db.refresh(session)
        return session
    
    @staticmethod
    def calculate_total_score(db: Session, session_id: int) -> float:
        """Calculate total interview score."""
        answers = db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session_id).all()
        if not answers:
            return 0.0
        
        total_score = sum(answer.score or 0 for answer in answers)
        avg_score = total_score / len(answers)
        
        # Update session with total score
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if session:
            session.total_score = round(avg_score, 2)
            db.commit()
        
        return round(avg_score, 2)

class DashboardService:
    @staticmethod
    def get_interviewer_sessions(db: Session, interviewer_id: int):
        """Get all sessions for an interviewer."""
        return db.query(InterviewSession).filter(
            InterviewSession.interviewer_id == interviewer_id
        ).order_by(InterviewSession.created_at.desc()).all()
    
    @staticmethod
    def get_session_details(db: Session, session_id: int, interviewer_id: int):
        """Get detailed session information."""
        session = db.query(InterviewSession).filter(
            InterviewSession.id == session_id,
            InterviewSession.interviewer_id == interviewer_id
        ).first()
        
        if not session:
            return None
        
        # Get questions, answers, and chat history
        questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session_id
        ).order_by(InterviewQuestion.question_number).all()
        
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.session_id == session_id
        ).all()
        
        chat_messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp).all()
        
        return {
            'session': session,
            'questions': questions,
            'answers': answers,
            'chat_history': chat_messages
        }