from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.models import Interviewer, InterviewSession
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str

class LoginRequest(BaseModel):
    email: str  # Changed from username to email to match frontend
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class CreateSessionRequest(BaseModel):
    candidate_email: EmailStr
    candidate_name: Optional[str] = None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user"""
    user_id_str = decode_access_token(token)
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id: int = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(Interviewer).filter(Interviewer.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

@router.post("/login")
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password"""
    # Try to find user by username or email
    user = db.query(Interviewer).filter(
        (Interviewer.username == login_data.email) |
        (Interviewer.email == login_data.email)
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    access_token = create_access_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name
        }
    }

@router.post("/register")
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new interviewer"""
    # Check if user already exists
    existing_user = db.query(Interviewer).filter(
        Interviewer.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = Interviewer(
        email=user_data.email,
        username=user_data.email,  # Use email as username
        full_name=user_data.name,
        hashed_password=hashed_password,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "message": "User created successfully"
    }

@router.post("/create-session")
async def create_interview_session(
    session_data: CreateSessionRequest,
    current_user: Interviewer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new interview session and send email to candidate"""
    import secrets

    # Generate unique session token
    session_token = f"sess_{secrets.token_urlsafe(16)}"

    # Create interview session
    new_session = InterviewSession(
        interviewer_id=current_user.id,
        session_token=session_token,
        candidate_email=session_data.candidate_email,
        candidate_name=session_data.candidate_name,
        status="created",
        current_question_index=0,
        total_score=0
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Send email to candidate with Resend (fast HTTP API)
    email_sent = False
    try:
        from app.services.email_service import EmailService
        import asyncio

        interview_link = f"https://ai-powered-interview-assistant-chi.vercel.app/interview/{session_token}"

        # Resend is fast HTTP API - shorter timeout is fine
        email_sent = await asyncio.wait_for(
            EmailService.send_interview_link(
                candidate_email=session_data.candidate_email,
                candidate_name=session_data.candidate_name or "Candidate",
                interview_link=interview_link,
                interviewer_name=current_user.full_name or current_user.username
            ),
            timeout=30.0  # 30 seconds is plenty for HTTP API + SMTP fallback
        )

        if email_sent:
            print(f"✅ Email sent successfully to {session_data.candidate_email}")
        else:
            print(f"⚠️ Email failed to send to {session_data.candidate_email}")

    except asyncio.TimeoutError:
        print(f"⏰ Email operation timed out for {session_data.candidate_email}")
        email_sent = False
    except Exception as e:
        # Log error but don't fail the session creation
        print(f"❌ Failed to send email: {e}")
        email_sent = False

    return {
        "id": new_session.id,
        "session_token": new_session.session_token,
        "candidate_email": new_session.candidate_email,
        "candidate_name": new_session.candidate_name,
        "status": new_session.status,
        "created_at": new_session.created_at,
        "interview_link": f"https://ai-powered-interview-assistant-chi.vercel.app/interview/{session_token}",
        "email_sent": email_sent,
        "message": f"Interview session created {'and email sent' if email_sent else '- please share the interview link manually'}"
    }

@router.get("/me")
async def get_current_user_info(current_user: Interviewer = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }