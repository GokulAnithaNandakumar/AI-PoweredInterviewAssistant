#!/usr/bin/env python3
"""Test the interview completion workflow with a fresh session."""

import sys
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

from app.core.database import get_db, SessionLocal
from app.services import InterviewService
from app.models import InterviewSession, InterviewAnswer, InterviewQuestion
from datetime import datetime
import json
import uuid

def test_fresh_session():
    db = SessionLocal()

    try:
        # Create a fresh test session directly in database
        session_token = f"test-session-{uuid.uuid4().hex[:12]}"

        # Create session directly
        session = InterviewSession(
            interviewer_id=1,  # Assume interviewer exists
            session_token=session_token,
            candidate_email="john.test@example.com",
            candidate_name="John Test",
            status="in_progress",
            current_question_index=0,
            total_score=0
        )

        db.add(session)
        db.commit()
        db.refresh(session)
        print(f"Created new session ID: {session.id}")

        # Create questions directly in database
        test_questions = [
            {"question_text": "What is your name?", "difficulty": "easy", "time_limit": 20},
            {"question_text": "What are HTTP methods?", "difficulty": "medium", "time_limit": 60},
            {"question_text": "Explain React state management", "difficulty": "hard", "time_limit": 120}
        ]

        # Add questions to session
        for i, q in enumerate(test_questions):
            question = InterviewQuestion(
                session_id=session.id,
                question_text=q["question_text"],
                difficulty=q["difficulty"],
                time_limit=q["time_limit"],
                question_number=i + 1
            )
            db.add(question)
            db.commit()
            db.refresh(question)
            print(f"Added question {i+1}: {question.question_text}")

            # Add sample answer
            answer = InterviewAnswer(
                session_id=session.id,
                question_id=question.id,
                answer_text=f"Test answer for question {i+1}",
                time_taken=30,
                score=8.0,
                ai_feedback=f"Good answer for question {i+1}. Shows understanding."
            )
            db.add(answer)
            db.commit()
            db.refresh(answer)
            print(f"Added answer {i+1}: score={answer.score}")

        # Manually trigger completion logic
        print("\n--- Testing completion logic ---")

        # Calculate total score
        total_score = InterviewService.calculate_total_score(db, session.id)
        print(f"Total score: {total_score}")

        # Generate summary
        summary = InterviewService.generate_interview_summary(db, session.id)
        print(f"Generated summary: {summary}")

        # Update session with completion data
        InterviewService.update_session_status(
            db, session.id, "completed",
            completed_at=datetime.utcnow(),
            total_score=total_score,
            ai_summary=json.dumps(summary),
            student_ai_summary=json.dumps({
                "performance_analysis": f"Student completed {summary.get('answered_questions', 0)}/3 questions with an average score of {total_score:.1f}/10",
                "total_answers": summary.get('answered_questions', 0),
                "average_score": total_score,
                "recommendation": summary.get('recommendation', 'Unknown'),
                "verdict_reason": summary.get('verdict_reason', 'No detailed analysis available')
            })
        )

        print("Session completion updated successfully!")

        # Verify the data was saved
        print("\n--- Verification ---")
        updated_session = db.query(InterviewSession).filter(InterviewSession.id == session.id).first()
        print(f"Final session status: {updated_session.status}")
        print(f"Final total_score: {updated_session.total_score}")
        print(f"AI summary stored: {updated_session.ai_summary is not None}")
        print(f"Student AI summary stored: {updated_session.student_ai_summary is not None}")

        if updated_session.ai_summary:
            print(f"AI summary preview: {updated_session.ai_summary[:200]}...")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_fresh_session()