#!/usr/bin/env python3
"""
Test script to manually save data to interview_sessions table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from app.models import InterviewSession, Interviewer
import json
from datetime import datetime

def test_data_insertion():
    """Test if we can manually insert data into interview_sessions"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    try:
        # Find an interviewer
        interviewer = db.query(Interviewer).first()
        if not interviewer:
            print("No interviewer found. Creating test interviewer...")
            from app.core.security import get_password_hash
            interviewer = Interviewer(
                email="test@test.com",
                username="testuser",
                hashed_password=get_password_hash("password123"),
                full_name="Test User"
            )
            db.add(interviewer)
            db.commit()
            db.refresh(interviewer)

        print(f"Using interviewer: {interviewer.username}")

        # Create test session
        test_session = InterviewSession(
            interviewer_id=interviewer.id,
            candidate_name="Test Candidate",
            candidate_email="test@candidate.com",
            candidate_phone="123-456-7890",
            resume_url="https://test-url.com/resume.pdf",
            resume_summary={"name": "Test", "skills": ["Python", "React"]},
            total_score=7.5,
            ai_summary='{"overall_score": 7, "recommendation": "Consider"}',
            student_ai_summary='{"performance": "Good performance"}',
            status="completed"
        )

        db.add(test_session)
        db.commit()
        db.refresh(test_session)

        print(f"Created test session: {test_session.id}")
        print(f"Resume URL: {test_session.resume_url}")
        print(f"Resume Summary: {test_session.resume_summary}")
        print(f"AI Summary: {test_session.ai_summary}")
        print(f"Student AI Summary: {test_session.student_ai_summary}")
        print(f"Total Score: {test_session.total_score}")

        return True

    except Exception as e:
        print(f"Test failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_data_insertion()