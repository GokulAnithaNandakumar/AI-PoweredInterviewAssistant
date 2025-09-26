#!/usr/bin/env python3
"""Regenerate summary for existing session 16."""

import sys
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

from app.core.database import get_db, SessionLocal
from app.services import InterviewService
from app.models import InterviewSession
from datetime import datetime
import json

def regenerate_session_16():
    db = SessionLocal()
    
    try:
        session_id = 16
        
        # Check if session exists
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            print(f"Session {session_id} not found")
            return
            
        print(f"Current session {session_id} status: {session.status}")
        print(f"Current total_score: {session.total_score}")
        print(f"Current ai_summary exists: {session.ai_summary is not None}")
        
        # Calculate current total score
        current_score = InterviewService.calculate_total_score(db, session_id)
        print(f"Recalculated score: {current_score}")
        
        # Generate fresh summary
        summary = InterviewService.generate_interview_summary(db, session_id)
        print(f"Generated summary: {summary}")
        
        # Update the session with fresh data
        InterviewService.update_session_status(
            db, session_id, "completed",
            completed_at=datetime.utcnow(),
            total_score=current_score,
            ai_summary=json.dumps(summary),
            student_ai_summary=json.dumps({
                "performance_analysis": f"Student completed {summary.get('answered_questions', 0)}/6 questions with an average score of {current_score:.1f}/10",
                "total_answers": summary.get('answered_questions', 0),
                "average_score": current_score,
                "recommendation": summary.get('recommendation', 'Unknown'),
                "verdict_reason": summary.get('verdict_reason', 'No detailed analysis available')
            })
        )
        
        print("\n✅ Session 16 successfully updated with fresh AI summary!")
        
        # Verify the update
        updated_session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        print(f"Updated ai_summary exists: {updated_session.ai_summary is not None}")
        print(f"Updated student_ai_summary exists: {updated_session.student_ai_summary is not None}")
        
        if updated_session.ai_summary:
            summary_data = json.loads(updated_session.ai_summary)
            print(f"Final recommendation: {summary_data.get('recommendation', 'Unknown')}")
            print(f"Overall score: {summary_data.get('overall_score', 'Unknown')}")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    regenerate_session_16()