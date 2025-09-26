from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import InterviewQuestion
from app.services import InterviewService
from app.ai_agents import QuestionGeneratorAgent, AnswerEvaluatorAgent, ResumeParserAgent, SummaryGeneratorAgent
from app.schemas import (
    InterviewSessionResponse, CandidateInfoUpdate, InterviewAnswerSubmit,
    ChatMessageCreate, ResumeUploadResponse
)
from typing import Optional
import PyPDF2
import docx
import io
from datetime import datetime

router = APIRouter(prefix="/interview", tags=["interview"])

# Initialize AI agents
question_agent = QuestionGeneratorAgent()
evaluator_agent = AnswerEvaluatorAgent()
resume_agent = ResumeParserAgent()
summary_agent = SummaryGeneratorAgent()

@router.get("/{session_token}/info", response_model=InterviewSessionResponse)
def get_session_info(
    session_token: str,
    db: Session = Depends(get_db)
):
    """Get session information by token."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.post("/{session_token}/upload-resume", response_model=ResumeUploadResponse)
async def upload_resume(
    session_token: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process resume file."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate file type
    if file.content_type not in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Read file content
    content = await file.read()
    text_content = ""
    
    try:
        if file.content_type == "application/pdf":
            # Parse PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text_content += page.extract_text()
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # Parse DOCX
            doc = docx.Document(io.BytesIO(content))
            for paragraph in doc.paragraphs:
                text_content += paragraph.text + "\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")
    
    # Extract information using AI
    extracted_info = resume_agent.extract_info(text_content)
    
    # Update session with extracted info
    InterviewService.update_candidate_info(db, session.id, {
        'candidate_name': extracted_info.get('name'),
        'candidate_email': extracted_info.get('email'),
        'candidate_phone': extracted_info.get('phone'),
        'resume_filename': file.filename,
        'resume_content': text_content
    })
    
    return ResumeUploadResponse(
        filename=file.filename,
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
    """Start the interview process."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if candidate info is complete
    if not all([session.candidate_name, session.candidate_email, session.candidate_phone]):
        raise HTTPException(status_code=400, detail="Candidate information incomplete")
    
    # Update session status
    InterviewService.update_session_status(
        db, session.id, "in_progress",
        started_at=datetime.utcnow(),
        current_question_index=1
    )
    
    # Generate first question
    question_data = question_agent.generate_question(
        difficulty="easy",
        question_number=1,
        context={
            'candidate_name': session.candidate_name,
            'candidate_email': session.candidate_email,
            'previous_questions': []
        }
    )
    
    # Save question to database
    question = InterviewService.add_question(db, session.id, question_data)
    
    return {
        "message": "Interview started successfully",
        "question": {
            "id": question.id,
            "question_number": question.question_number,
            "difficulty": question.difficulty,
            "question_text": question.question_text,
            "time_limit": question.time_limit
        }
    }

@router.post("/{session_token}/submit-answer")
def submit_answer(
    session_token: str,
    answer_data: InterviewAnswerSubmit,
    question_id: int,
    db: Session = Depends(get_db)
):
    """Submit answer for a question."""
    session = InterviewService.get_session_by_token(db, session_token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get question
    question = db.query(InterviewQuestion).filter(InterviewQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Evaluate answer using AI
    evaluation = evaluator_agent.evaluate_answer(
        question={
            'question': question.question_text,
            'difficulty': question.difficulty,
            'time_limit': question.time_limit,
            'expected_topics': [],
            'evaluation_criteria': []
        },
        answer=answer_data.answer_text or "",
        time_taken=answer_data.time_taken or question.time_limit
    )
    
    # Save answer
    answer = InterviewService.add_answer(db, session.id, question_id, {
        'answer_text': answer_data.answer_text,
        'time_taken': answer_data.time_taken,
        'score': evaluation['score'],
        'ai_feedback': evaluation['feedback']
    })
    
    # Check if interview is complete
    current_question = session.current_question_index
    if current_question >= 6:
        # Interview completed - generate summary
        total_score = InterviewService.calculate_total_score(db, session.id)
        
        # Generate AI summary
        session_data = {
            'candidate': {
                'name': session.candidate_name,
                'email': session.candidate_email,
                'phone': session.candidate_phone
            },
            'questions': [q.__dict__ for q in session.questions],
            'answers': [a.__dict__ for a in session.answers],
            'total_score': total_score
        }
        ai_summary = summary_agent.generate_summary(session_data)
        
        # Update session
        InterviewService.update_session_status(
            db, session.id, "completed",
            completed_at=datetime.utcnow(),
            ai_summary=ai_summary
        )
        
        return {
            "answer_submitted": True,
            "interview_completed": True,
            "total_score": total_score,
            "summary": ai_summary
        }
    else:
        # Generate next question
        difficulty_map = {1: "easy", 2: "easy", 3: "medium", 4: "medium", 5: "hard", 6: "hard"}
        next_difficulty = difficulty_map.get(current_question + 1, "medium")
        
        previous_questions = [q.question_text for q in session.questions]
        
        next_question_data = question_agent.generate_question(
            difficulty=next_difficulty,
            question_number=current_question + 1,
            context={
                'candidate_name': session.candidate_name,
                'candidate_email': session.candidate_email,
                'previous_questions': previous_questions
            }
        )
        
        # Save next question
        next_question = InterviewService.add_question(db, session.id, next_question_data)
        
        # Update session
        InterviewService.update_session_status(
            db, session.id, "in_progress",
            current_question_index=current_question + 1
        )
        
        return {
            "answer_submitted": True,
            "interview_completed": False,
            "next_question": {
                "id": next_question.id,
                "question_number": next_question.question_number,
                "difficulty": next_question.difficulty,
                "question_text": next_question.question_text,
                "time_limit": next_question.time_limit
            },
            "evaluation": evaluation
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
    
    # Add message
    message = InterviewService.add_chat_message(db, session.id, message_data.dict())
    
    return {"message": "Chat message added successfully", "id": message.id}