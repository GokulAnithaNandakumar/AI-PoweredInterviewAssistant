#!/usr/bin/env python3
"""
Test script to verify interview scoring and summary generation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings
from app.models import InterviewSession, InterviewAnswer, InterviewQuestion, Interviewer
from app.services import InterviewService

def test_scoring_and_summary():
    """Test scoring calculation and summary generation"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
def test_scoring():
    db = SessionLocal()
    
    try:
        # Test with session 16
        session_id = 16
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        
        if not session:
            print(f"Session {session_id} not found!")
            return
        
        print(f"Testing session ID: {session.id}")
        print(f"Current total_score: {session.total_score}")
        print(f"Current ai_summary: {session.ai_summary}")
        
        # Check answers for this session
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.session_id == session.id
        ).all()
        
        print(f"Found {len(answers)} answers:")
        for answer in answers:
            question = db.query(InterviewQuestion).filter(
                InterviewQuestion.id == answer.question_id
            ).first()
            print(f"  Q{question.question_number if question else 'Unknown'}: score={answer.score}, feedback={answer.ai_feedback[:50] if answer.ai_feedback else 'None'}...")
        
        # Test score calculation
        calculated_score = InterviewService.calculate_total_score(db, session.id)
        print(f"Calculated average score: {calculated_score}")
        
        # Test summary generation
        summary = InterviewService.generate_interview_summary(db, session.id)
        print(f"Generated summary: {summary}")
        
    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_scoring_and_summary()