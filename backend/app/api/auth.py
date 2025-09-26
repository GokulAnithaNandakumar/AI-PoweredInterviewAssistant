from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, verify_token
from app.schemas import InterviewerCreate, InterviewerLogin, InterviewerResponse, Token
from app.services import InterviewerService
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", response_model=InterviewerResponse)
def register_interviewer(
    interviewer_data: InterviewerCreate,
    db: Session = Depends(get_db)
):
    """Register a new interviewer account."""
    # Check if username already exists
    existing_interviewer = InterviewerService.get_interviewer_by_username(
        db, interviewer_data.username
    )
    if existing_interviewer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new interviewer
    interviewer = InterviewerService.create_interviewer(db, interviewer_data)
    return interviewer

@router.post("/login", response_model=Token)
def login_interviewer(
    credentials: InterviewerLogin,
    db: Session = Depends(get_db)
):
    """Login interviewer and return access token."""
    interviewer = InterviewerService.authenticate_interviewer(db, credentials)
    if not interviewer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        subject=interviewer.username, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/create-session")
def create_interview_session(
    token: str = Depends(security),
    db: Session = Depends(get_db)
):
    """Create a new interview session and return candidate link."""
    # Verify token
    username = verify_token(token.credentials)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Get interviewer
    interviewer = InterviewerService.get_interviewer_by_username(db, username)
    if not interviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interviewer not found"
        )
    
    # Create session
    session_token = InterviewerService.create_session_token(db, interviewer.id)
    
    return {
        "session_token": session_token,
        "candidate_link": f"/interview/{session_token}",
        "dashboard_link": f"/dashboard/{session_token}"
    }