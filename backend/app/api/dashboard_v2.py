from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json

from app.core.database import get_db
from app.api.auth_v2 import get_current_user
from app.models import Interviewer, InterviewSession, InterviewQuestion, InterviewAnswer

def safe_json_loads(json_str):
    """Safely parse JSON string, return None if invalid"""
    if not json_str:
        return None
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return None

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/sessions")
def get_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Interviewer = Depends(get_current_user)
):
    """Get all interview sessions for the current user"""
    try:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.interviewer_id == current_user.id
        ).offset(skip).limit(limit).all()

        return [{
            "id": session.id,
            "session_token": session.session_token,
            "candidate_email": session.candidate_email,
            "candidate_name": session.candidate_name,
            "candidate_phone": session.candidate_phone,
            "resume_url": session.resume_url,
            "resume_filename": session.resume_filename,
            "status": session.status,
            "current_question_index": session.current_question_index,
            "total_score": session.total_score,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "ai_summary": safe_json_loads(session.ai_summary),
            "student_ai_summary": safe_json_loads(session.student_ai_summary)
        } for session in sessions]
    except Exception as e:
        print(f"Error in get_sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: Interviewer = Depends(get_current_user)
):
    """Get dashboard statistics for the current user"""
    try:
        # Get all sessions for the current user
        sessions = db.query(InterviewSession).filter(
            InterviewSession.interviewer_id == current_user.id
        ).all()

        total_interviews = len(sessions)
        completed_interviews = len([s for s in sessions if s.status == "completed"])
        in_progress_interviews = len([s for s in sessions if s.status == "in_progress"])

        # Calculate average score for completed interviews
        completed_with_score = [s for s in sessions if s.status == "completed" and s.total_score > 0]
        avg_score = sum(s.total_score for s in completed_with_score) / len(completed_with_score) if completed_with_score else 0

        return {
            "total_interviews": total_interviews,
            "completed_interviews": completed_interviews,
            "in_progress_interviews": in_progress_interviews,
            "avg_score": round(avg_score, 1)
        }
    except Exception as e:
        print(f"Error in get_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_interview_session(
    session_id: int,
    current_user: Interviewer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an interview session"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.interviewer_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete related questions and answers
    db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session_id).delete()
    db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session_id).delete()

    # Delete the session
    db.delete(session)
    db.commit()

    return {"message": "Session deleted successfully"}

@router.get("/sessions/{session_id}/details")
async def get_session_details(
    session_id: int,
    current_user: Interviewer = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific interview session"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.interviewer_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get questions
    questions = db.query(InterviewQuestion).filter(
        InterviewQuestion.session_id == session_id
    ).order_by(InterviewQuestion.question_number).all()

    # Get answers
    answers = db.query(InterviewAnswer).filter(
        InterviewAnswer.session_id == session_id
    ).all()

    return {
        "session": {
            "id": session.id,
            "session_token": session.session_token,
            "candidate_email": session.candidate_email,
            "candidate_name": session.candidate_name,
            "resume_url": session.resume_url,
            "status": session.status,
            "current_question_index": session.current_question_index,
            "total_score": session.total_score,
            "created_at": session.created_at,
            "started_at": session.started_at,
            "completed_at": session.completed_at,
            "ai_summary": safe_json_loads(session.ai_summary),
            "student_ai_summary": safe_json_loads(session.student_ai_summary)
        },
        "questions": [{
            "id": q.id,
            "question_number": q.question_number,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "time_limit": q.time_limit,
            "generated_at": q.generated_at
        } for q in questions],
        "answers": [{
            "id": a.id,
            "question_id": a.question_id,
            "answer_text": a.answer_text,
            "time_taken": a.time_taken,
            "score": a.score,
            "ai_feedback": a.ai_feedback,
            "submitted_at": a.submitted_at
        } for a in answers]
    }