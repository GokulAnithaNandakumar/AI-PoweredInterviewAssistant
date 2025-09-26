from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_token
from app.services import InterviewerService, DashboardService
from app.schemas import CandidateListItem, CandidateDetails
from typing import List

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
security = HTTPBearer()

@router.get("/sessions", response_model=List[CandidateListItem])
def get_interviewer_sessions(
    token: str = Depends(security),
    db: Session = Depends(get_db)
):
    """Get all interview sessions for the authenticated interviewer."""
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

    # Get sessions
    sessions = DashboardService.get_interviewer_sessions(db, interviewer.id)

    return [
        CandidateListItem(
            id=session.id,
            session_token=session.session_token,
            candidate_name=session.candidate_name,
            candidate_email=session.candidate_email,
            status=session.status,
            total_score=session.total_score,
            created_at=session.created_at,
            completed_at=session.completed_at
        )
        for session in sessions
    ]

@router.get("/session/{session_id}", response_model=CandidateDetails)
def get_session_details(
    session_id: int,
    token: str = Depends(security),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific interview session."""
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

    # Get session details
    details = DashboardService.get_session_details(db, session_id, interviewer.id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return CandidateDetails(
        **details['session'].__dict__,
        questions=details['questions'],
        answers=details['answers'],
        chat_history=details['chat_history']
    )

@router.get("/stats")
def get_dashboard_stats(
    token: str = Depends(security),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for the interviewer."""
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

    # Get sessions
    sessions = DashboardService.get_interviewer_sessions(db, interviewer.id)

    # Calculate stats
    total_sessions = len(sessions)
    completed_sessions = len([s for s in sessions if s.status == "completed"])
    in_progress_sessions = len([s for s in sessions if s.status == "in_progress"])
    average_score = 0.0

    if completed_sessions > 0:
        total_score = sum(s.total_score for s in sessions if s.status == "completed")
        average_score = round(total_score / completed_sessions, 2)

    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "in_progress_sessions": in_progress_sessions,
        "average_score": average_score,
        "completion_rate": round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0
    }