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
            # Update existing fields
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

            # Update new fields
            if candidate_info.get('resume_url'):
                session.resume_url = candidate_info['resume_url']
            if candidate_info.get('resume_summary'):
                session.resume_summary = candidate_info['resume_summary']

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
                else:
                    print(f"Warning: Session doesn't have attribute {key}")
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def calculate_total_score(db: Session, session_id: int) -> float:
        """Calculate total interview score without updating session."""
        answers = db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session_id).all()
        if not answers:
            return 0.0

        # Get scores, filtering out None values
        scores = [answer.score for answer in answers if answer.score is not None]
        if not scores:
            return 0.0

        avg_score = sum(scores) / len(scores)
        return round(avg_score, 2)

    @staticmethod
    def save_answer(db: Session, session_id: int, answer_data: dict):
        """Save an answer with AI evaluation."""
        try:
            # Create or find the question record
            question = db.query(InterviewQuestion).filter(
                InterviewQuestion.session_id == session_id,
                InterviewQuestion.question_number == answer_data['question_number']
            ).first()

            # If question doesn't exist, create it (fallback)
            if not question:
                # Determine difficulty and time limit based on question number
                question_number = answer_data['question_number']
                if question_number <= 2:
                    difficulty = 'easy'
                    time_limit = 20
                elif question_number <= 4:
                    difficulty = 'medium'
                    time_limit = 60
                else:
                    difficulty = 'hard'
                    time_limit = 120

                question = InterviewQuestion(
                    session_id=session_id,
                    question_number=question_number,
                    difficulty=difficulty,
                    question_text=f"Question {question_number}",  # Placeholder
                    time_limit=time_limit
                )
                db.add(question)
                db.commit()
                db.refresh(question)

            # Check if answer already exists
            existing_answer = db.query(InterviewAnswer).filter(
                InterviewAnswer.session_id == session_id,
                InterviewAnswer.question_id == question.id
            ).first()

            if existing_answer:
                # Update existing answer
                existing_answer.answer_text = answer_data.get('answer_text')
                existing_answer.time_taken = answer_data.get('time_taken')
                existing_answer.score = answer_data.get('score')
                existing_answer.ai_feedback = answer_data.get('ai_feedback')
                print(f"Updated answer for Q{answer_data['question_number']}: score={existing_answer.score}")
            else:
                # Create new answer
                new_answer = InterviewAnswer(
                    session_id=session_id,
                    question_id=question.id,
                    answer_text=answer_data.get('answer_text'),
                    time_taken=answer_data.get('time_taken'),
                    score=answer_data.get('score'),
                    ai_feedback=answer_data.get('ai_feedback')
                )
                db.add(new_answer)
                print(f"Created new answer for Q{answer_data['question_number']}: score={new_answer.score}")

            db.commit()
            return True

        except Exception as e:
            print(f"Error saving answer: {e}")
            db.rollback()
            return False

    @staticmethod
    def generate_interview_summary(db: Session, session_id: int) -> dict:
        """Generate interview summary based on actual answers and feedback."""
        try:
            # Get session info
            session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
            if not session:
                return {"error": "Session not found"}

            # Get all answers with their feedback
            answers = db.query(InterviewAnswer).join(InterviewQuestion).filter(
                InterviewAnswer.session_id == session_id
            ).order_by(InterviewQuestion.question_number).all()

            if not answers:
                return {
                    "overall_score": 0,
                    "recommendation": "Reject",
                    "summary": "No answers were provided during the interview.",
                    "total_questions": 0,
                    "answered_questions": 0
                }

            # Calculate statistics
            total_questions = 6  # Expected questions
            answered_questions = len(answers)
            scores = [answer.score for answer in answers if answer.score is not None]
            avg_score = sum(scores) / len(scores) if scores else 0

            # Collect all AI feedback
            feedback_summary = []
            for answer in answers:
                if answer.ai_feedback:
                    feedback_summary.append(f"Q{answer.question.question_number}: {answer.ai_feedback}")

            # Generate recommendation based on average score
            if avg_score >= 7:
                recommendation = "Move Forward"
                verdict_reason = "Strong performance across technical questions."
            elif avg_score >= 5:
                recommendation = "Consider"
                verdict_reason = "Moderate performance with some areas for improvement."
            else:
                recommendation = "Reject"
                verdict_reason = "Below expectations for the technical requirements."

            return {
                "overall_score": round(avg_score, 1),
                "recommendation": recommendation,
                "summary": f"Candidate completed {answered_questions}/{total_questions} questions with an average score of {avg_score:.1f}/10. {verdict_reason}",
                "total_questions": total_questions,
                "answered_questions": answered_questions,
                "detailed_feedback": feedback_summary,
                "verdict_reason": verdict_reason
            }

        except Exception as e:
            print(f"Error generating interview summary: {e}")
            return {
                "overall_score": 0,
                "recommendation": "Reject",
                "summary": "Error generating interview summary.",
                "error": str(e)
            }

    @staticmethod
    def get_session_answers(db: Session, session_id: int):
        """Get all answers for a session for summary generation."""
        try:
            answers = db.query(InterviewAnswer).join(InterviewQuestion).filter(
                InterviewAnswer.session_id == session_id
            ).order_by(InterviewQuestion.question_number).all()

            questions_and_answers = []
            for answer in answers:
                questions_and_answers.append({
                    'question_number': answer.question.question_number,
                    'question': answer.question.question_text,
                    'difficulty': answer.question.difficulty,
                    'answer': answer.answer_text,
                    'time_taken': answer.time_taken,
                    'score': answer.score
                })

            return questions_and_answers
        except Exception as e:
            print(f"Error getting session answers: {e}")
            return []
        """Get all answers for a session for summary generation."""
        try:
            answers = db.query(InterviewAnswer).join(InterviewQuestion).filter(
                InterviewAnswer.session_id == session_id
            ).order_by(InterviewQuestion.question_number).all()

            questions_and_answers = []
            for answer in answers:
                questions_and_answers.append({
                    'question_number': answer.question.question_number,
                    'question': answer.question.question_text,
                    'difficulty': answer.question.difficulty,
                    'answer': answer.answer_text,
                    'time_taken': answer.time_taken,
                    'score': answer.score
                })

            return questions_and_answers
        except Exception as e:
            print(f"Error getting session answers: {e}")
            return []

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