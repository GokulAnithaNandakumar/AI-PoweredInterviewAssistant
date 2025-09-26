#!/usr/bin/env python3
"""
Test script to manually update AI summary
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from app.models import InterviewSession
from app.services import InterviewService

def test_manual_summary_update():
    """Test manually updating AI summary"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    try:
        # Get the latest session
        session = db.query(InterviewSession).order_by(InterviewSession.id.desc()).first()
        if not session:
            print("No interview sessions found")
            return
        
        print(f"Updating session ID: {session.id}")
        
        # Generate summary
        summary = InterviewService.generate_interview_summary(db, session.id)
        print(f"Generated summary: {summary}")
        
        # Try to update the session manually
        session.ai_summary = json.dumps(summary)
        session.student_ai_summary = json.dumps({
            "performance_analysis": f"Test update - score: {summary.get('overall_score', 0)}",
            "recommendation": summary.get('recommendation', 'Unknown')
        })
        
        db.commit()
        db.refresh(session)
        
        print(f"Updated ai_summary: {session.ai_summary}")
        print(f"Updated student_ai_summary: {session.student_ai_summary}")
        
    except Exception as e:
        print(f"Test failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_manual_summary_update()