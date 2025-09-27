from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import InterviewQuestion
from app.services import InterviewService
from app.services.email_service import EmailService
from app.ai_agents import (
    QuestionGeneratorAgent,
    AnswerEvaluatorAgent,
    ResumeParserAgent,
    InterviewSummaryAgent,
    ResumeStorageService
)
from app.schemas import (
    InterviewSessionResponse, CandidateInfoUpdate, InterviewAnswerSubmit,
    ChatMessageCreate, ResumeUploadResponse
)
from typing import Optional
import PyPDF2
import docx
import io
import json
from datetime import datetime

router = APIRouter(prefix="/interview", tags=["interview"])

# Initialize AI agents
question_agent = QuestionGeneratorAgent()
evaluator_agent = AnswerEvaluatorAgent()
resume_agent = ResumeParserAgent()
summary_agent = InterviewSummaryAgent()
storage_service = ResumeStorageService()

@router.get("/{session_token}/info", response_model=InterviewSessionResponse)
def get_session_info(
    session_token: str,
    db: Session = Depends(get_db)
):
    """Get session information by token."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Ensure ai_summary is always a string for API response
    if session.ai_summary is not None and not isinstance(session.ai_summary, str):
        # If it's a dictionary, convert it to JSON string
        session.ai_summary = json.dumps(session.ai_summary) if session.ai_summary else None
        # Update in database to fix any data inconsistency
        db.commit()

    # Ensure student_ai_summary is always a string for API response
    if session.student_ai_summary is not None and not isinstance(session.student_ai_summary, str):
        # If it's a dictionary, convert it to JSON string
        session.student_ai_summary = json.dumps(session.student_ai_summary) if session.student_ai_summary else None
        # Update in database to fix any data inconsistency
        db.commit()

    return session

@router.post("/{session_token}/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(
    session_token: str,
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process resume file."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if interview already taken
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed. Each interview can only be taken once.")

    # Validate file type (temporarily accepting text files for testing)
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ]
    if resume.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")

    # Read file content
    content = await resume.read()
    text_content = ""

    try:
        if resume.content_type == "application/pdf":
            # Parse PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text_content += page.extract_text()
        elif resume.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # Parse DOCX
            doc = docx.Document(io.BytesIO(content))
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
        elif resume.content_type == "text/plain":
            # Parse plain text
            text_content = content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    # Extract information using AI
    extracted_info = resume_agent.extract_information(text_content)

    # Store resume in Cloudinary
    try:
        candidate_name = extracted_info.get('name', 'unknown')
        resume_url = storage_service.store_resume(content, resume.filename, candidate_name)
    except Exception as e:
        print(f"Cloudinary storage failed, using fallback: {str(e)}")
        resume_url = "http://localhost:8000/temp-resume-url"

    # Update session with extracted info and resume storage info
    update_data = {
        'candidate_name': extracted_info.get('name'),
        'candidate_email': extracted_info.get('email'),
        'candidate_phone': extracted_info.get('phone'),
        'resume_content': text_content[:5000],  # Store first 5000 chars for quick access
        'resume_url': resume_url,
        'resume_filename': resume.filename,
        'resume_summary': extracted_info  # Store all parsed data as JSON
    }

    # Update session in database
    try:
        updated_session = InterviewService.update_candidate_info(db, session.id, update_data)
        if not updated_session:
            raise HTTPException(status_code=500, detail="Failed to update session")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    return ResumeUploadResponse(
        filename=resume.filename,
        extracted_data=extracted_info,
        missing_fields=extracted_info.get('missing_fields', [])
    )

@router.put("/{session_token}/candidate-info")
def update_candidate_info(
    session_token: str,
    candidate_info: CandidateInfoUpdate,
    db: Session = Depends(get_db)
):
    """Update missing candidate information."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update candidate info
    updated_session = InterviewService.update_candidate_info(
        db, session.id, candidate_info.dict(exclude_unset=True)
    )

    return {"message": "Candidate information updated successfully"}

@router.post("/{session_token}/start-interview")
def start_interview(
    session_token: str,
    db: Session = Depends(get_db)
):
    """Start the interview process and generate all questions."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if interview already completed
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Interview already completed")

    # Check if candidate info is complete
    if not all([session.candidate_name, session.candidate_email, session.candidate_phone]):
        raise HTTPException(status_code=400, detail="Candidate information incomplete")

    # Prepare resume data for AI question generation
    resume_summary = session.resume_summary or {}
    resume_data = {
        'name': session.candidate_name,
        'email': session.candidate_email,
        'phone': session.candidate_phone,
        'experience': resume_summary.get('experience'),
        'skills': resume_summary.get('skills', []),
        'education': resume_summary.get('education'),
        'current_position': resume_summary.get('current_position'),
        'projects': resume_summary.get('projects'),
        'resume_content': session.resume_content
    }

    # Generate all 6 questions (2 Easy, 2 Medium, 2 Hard)
    questions_data = []
    previous_questions = []

    # Question difficulty distribution
    difficulties = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard']

    for i, difficulty in enumerate(difficulties, 1):
        try:
            question_data = question_agent.generate_question(
                difficulty=difficulty,
                question_number=i,
                resume_data=resume_data,
                previous_questions=previous_questions
            )

            questions_data.append(question_data)
            previous_questions.append(question_data['question'])

        except Exception as e:
            # Fallback questions if AI fails
            fallback_questions = {
                'easy': "Explain the difference between React functional and class components.",
                'medium': "How would you implement state management in a React application with multiple components?",
                'hard': "Design the architecture for a scalable real-time chat application using React and Node.js."
            }

            questions_data.append({
                'question': fallback_questions[difficulty],
                'difficulty': difficulty,
                'time_limit': {'easy': 20, 'medium': 60, 'hard': 120}[difficulty],
                'category': 'Fullstack',
                'question_number': i
            })

    # Store generated questions in database
    for question_data in questions_data:
        db_question = InterviewQuestion(
            session_id=session.id,
            question_number=question_data['question_number'],
            difficulty=question_data['difficulty'],
            question_text=question_data['question'],
            time_limit=question_data['time_limit']
        )
        db.add(db_question)

    db.commit()

    # Update session status to in_progress
    InterviewService.update_session_status(
        db, session.id, "in_progress",
        started_at=datetime.utcnow(),
        current_question_index=0  # Start with first question (0-indexed)
    )

    return {
        "message": "Interview started successfully",
        "questions": questions_data,
        "total_questions": len(questions_data),
        "instructions": "You will have 6 questions total: 2 Easy (20s each), 2 Medium (60s each), and 2 Hard (120s each). Questions are generated based on your resume."
    }

@router.post("/{session_token}/submit-answer")
async def submit_answer(
    session_token: str,
    answer_data: InterviewAnswerSubmit,
    db: Session = Depends(get_db)
):
    """Submit answer for a question and get AI evaluation."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Prepare question data for evaluation
    question_number = answer_data.question_number
    if question_number < 1 or question_number > 6:
        raise HTTPException(status_code=400, detail="Invalid question number")

    # Determine difficulty based on question number (2 easy, 2 medium, 2 hard)
    if question_number <= 2:
        difficulty = 'easy'
        time_limit = 20
    elif question_number <= 4:
        difficulty = 'medium'
        time_limit = 60
    else:
        difficulty = 'hard'
        time_limit = 120

    # Get resume data for context
    resume_summary = session.resume_summary or {}
    resume_data = {
        'name': session.candidate_name,
        'email': session.candidate_email,
        'experience': resume_summary.get('experience'),
        'skills': resume_summary.get('skills', []),
        'education': resume_summary.get('education'),
        'current_position': resume_summary.get('current_position')
    }

    # Evaluate answer using AI
    try:
        question_context = {
            'question': f"Question {question_number}",  # We don't store the actual question text
            'difficulty': difficulty,
            'time_limit': time_limit,
            'category': 'Fullstack',
            'evaluation_criteria': ['Technical accuracy', 'Clarity', 'Depth of understanding']
        }

        evaluation = evaluator_agent.evaluate_answer(
            question=question_context,
            answer=answer_data.answer or "",
            resume_data=resume_data
        )
    except Exception as e:
        # Fallback evaluation if AI fails
        evaluation = {
            'score': 5,
            'feedback': 'Answer received but could not be automatically evaluated.',
            'strengths': ['Response provided'],
            'improvements': ['Manual review needed'],
            'technical_accuracy': 5,
            'communication': 5
        }

    # Store answer and evaluation
    try:
        InterviewService.save_answer(db, session.id, {
            'question_number': question_number,
            'answer_text': answer_data.answer,
            'time_taken': answer_data.time_taken,
            'score': evaluation['score'],
            'ai_feedback': evaluation.get('feedback', ''),
            'ai_evaluation': evaluation
        })
    except Exception as e:
        print(f"Failed to save answer: {e}")
        # Continue anyway - don't let this block the flow

    # Update current question index
    InterviewService.update_session_status(
        db, session.id, "in_progress",
        current_question_index=question_number
    )

    # Check if interview is complete (all 6 questions answered)
    if question_number >= 6:
        # Ensure the last answer is committed before calculating score
        db.commit()

        # Calculate total score from all answers
        total_score = InterviewService.calculate_total_score(db, session.id)

        # Generate final summary
        try:
            # Generate summary based on actual interview data
            summary = InterviewService.generate_interview_summary(db, session.id)

            # Update session as completed
            try:
                InterviewService.update_session_status(
                    db, session.id, "completed",
                    completed_at=datetime.utcnow(),
                    total_score=total_score,
                    ai_summary=json.dumps(summary),  # Convert dict to JSON string
                    student_ai_summary=json.dumps({
                        "performance_analysis": f"Student completed {summary.get('answered_questions', 0)}/6 questions with an average score of {total_score:.1f}/10",
                        "total_answers": summary.get('answered_questions', 0),
                        "average_score": total_score,
                        "recommendation": summary.get('recommendation', 'Unknown'),
                        "verdict_reason": summary.get('verdict_reason', 'No detailed analysis available')
                    })
                )
            except Exception as e:
                print(f"Failed to update session completion: {e}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to save interview completion: {str(e)}")

            return {
                "message": "Interview completed!",
                "evaluation": evaluation,
                "interview_complete": True,
                "final_summary": summary
            }
        except Exception as e:
            print(f"AI summary generation failed: {e}")
            # Fallback completion
            try:
                InterviewService.update_session_status(
                    db, session.id, "completed",
                    completed_at=datetime.utcnow(),
                    total_score=total_score
                )
            except Exception as e2:
                print(f"Failed to update session status in fallback: {e2}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to complete interview")

    return {
        "message": "Answer submitted successfully",
        "evaluation": evaluation,
        "interview_complete": question_number >= 6,
        "next_question": question_number + 1 if question_number < 6 else None
    }

@router.post("/{session_token}/chat")
def add_chat_message(
    session_token: str,
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db)
):
    """Add a chat message to the session."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add message (implement this method in InterviewService if needed)
    # message = InterviewService.add_chat_message(db, session.id, message_data.dict())

    return {"message": "Chat message added successfully"}