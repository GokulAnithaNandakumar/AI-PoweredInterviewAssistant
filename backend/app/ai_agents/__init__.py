import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from typing import Dict, Any, List
import json

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

class QuestionGeneratorAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )
    
    def generate_question(self, difficulty: str, question_number: int, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a question based on difficulty level and context."""
        
        difficulty_prompts = {
            "easy": {
                "time_limit": 20,
                "description": "Basic concepts, syntax, or simple problem-solving",
                "examples": "What is React? Explain useState hook. What is the difference between let and var?"
            },
            "medium": {
                "time_limit": 60,
                "description": "Intermediate concepts, debugging, or small code implementations",
                "examples": "How would you optimize a React component? Implement a simple API call. Explain closures with an example."
            },
            "hard": {
                "time_limit": 120,
                "description": "Complex problem-solving, system design, or advanced concepts",
                "examples": "Design a scalable chat system. Implement a complex algorithm. Explain microservices architecture."
            }
        }
        
        prompt = f"""
        You are an expert technical interviewer for a Full Stack Developer position (React/Node.js).
        
        Generate Question #{question_number} with {difficulty.upper()} difficulty level.
        
        Difficulty Guidelines:
        - {difficulty.upper()}: {difficulty_prompts[difficulty]["description"]}
        - Time Limit: {difficulty_prompts[difficulty]["time_limit"]} seconds
        - Examples: {difficulty_prompts[difficulty]["examples"]}
        
        Candidate Context:
        - Name: {context.get('candidate_name', 'Not provided')}
        - Email: {context.get('candidate_email', 'Not provided')}
        
        Previous Questions (avoid repetition):
        {context.get('previous_questions', [])}
        
        Requirements:
        1. Generate ONE clear, specific question
        2. Make it relevant to Full Stack Development (React/Node.js)
        3. Ensure it matches the difficulty level
        4. Make it engaging and practical
        5. Avoid repeating previous questions
        
        Return ONLY a JSON object with this structure:
        {{
            "question": "Your generated question here",
            "difficulty": "{difficulty}",
            "time_limit": {difficulty_prompts[difficulty]["time_limit"]},
            "expected_topics": ["topic1", "topic2", "topic3"],
            "evaluation_criteria": ["criteria1", "criteria2", "criteria3"]
        }}
        """
        
        try:
            response = self.llm.invoke([SystemMessage(content=prompt)])
            result = json.loads(response.content.strip())
            result["question_number"] = question_number
            return result
        except Exception as e:
            # Fallback question
            return {
                "question": f"Tell me about your experience with {difficulty}-level Full Stack development challenges.",
                "difficulty": difficulty,
                "time_limit": difficulty_prompts[difficulty]["time_limit"],
                "question_number": question_number,
                "expected_topics": ["experience", "problem-solving", "technical skills"],
                "evaluation_criteria": ["clarity", "depth", "examples"]
            }

class AnswerEvaluatorAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
    
    def evaluate_answer(self, question: Dict[str, Any], answer: str, time_taken: int) -> Dict[str, Any]:
        """Evaluate an interview answer and provide score + feedback."""
        
        prompt = f"""
        You are an expert technical interviewer evaluating a candidate's answer.
        
        QUESTION DETAILS:
        - Question: {question.get('question')}
        - Difficulty: {question.get('difficulty')}
        - Time Limit: {question.get('time_limit')} seconds
        - Expected Topics: {question.get('expected_topics', [])}
        - Evaluation Criteria: {question.get('evaluation_criteria', [])}
        
        CANDIDATE'S ANSWER:
        "{answer}"
        
        TIME PERFORMANCE:
        - Time Taken: {time_taken} seconds
        - Time Limit: {question.get('time_limit')} seconds
        - Time Usage: {(time_taken / question.get('time_limit', 1)) * 100:.1f}%
        
        EVALUATION INSTRUCTIONS:
        1. Score the answer on a scale of 0-10 considering:
           - Technical accuracy and depth
           - Completeness of the answer
           - Communication clarity
           - Time management
           - Relevance to the question
        
        2. Provide constructive feedback focusing on:
           - What was done well
           - Areas for improvement
           - Specific technical points
           - Communication effectiveness
        
        3. Be fair but professional in your assessment
        
        Return ONLY a JSON object with this structure:
        {{
            "score": 8.5,
            "feedback": "Detailed constructive feedback here...",
            "strengths": ["strength1", "strength2"],
            "improvements": ["improvement1", "improvement2"],
            "technical_accuracy": 8.0,
            "communication_clarity": 9.0,
            "time_management": 7.5
        }}
        """
        
        try:
            response = self.llm.invoke([SystemMessage(content=prompt)])
            result = json.loads(response.content.strip())
            
            # Ensure score is within bounds
            result["score"] = max(0, min(10, result.get("score", 5)))
            
            return result
        except Exception as e:
            # Fallback evaluation
            base_score = 5.0
            if len(answer.strip()) > 50:  # Basic length check
                base_score += 2.0
            if time_taken <= question.get('time_limit', 60):  # Time bonus
                base_score += 1.0
                
            return {
                "score": min(10, base_score),
                "feedback": "Thank you for your answer. Your response shows effort and engagement with the question.",
                "strengths": ["Provided a response", "Stayed within time limit" if time_taken <= question.get('time_limit', 60) else "Took time to think"],
                "improvements": ["Could provide more technical depth", "Consider including specific examples"],
                "technical_accuracy": base_score * 0.8,
                "communication_clarity": base_score * 0.9,
                "time_management": 8.0 if time_taken <= question.get('time_limit', 60) else 5.0
            }

class ResumeParserAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1
        )
    
    def extract_info(self, resume_text: str) -> Dict[str, Any]:
        """Extract key information from resume text."""
        
        prompt = f"""
        You are an expert resume parser. Extract the following information from this resume:
        
        RESUME TEXT:
        {resume_text}
        
        EXTRACT THE FOLLOWING (if available):
        1. Full Name
        2. Email Address  
        3. Phone Number
        4. Technical Skills (especially React, Node.js, JavaScript, etc.)
        5. Work Experience (brief summary)
        6. Education (highest degree)
        
        Return ONLY a JSON object with this structure:
        {{
            "name": "Full Name or null",
            "email": "email@example.com or null",
            "phone": "phone number or null",
            "skills": ["skill1", "skill2", "skill3"],
            "experience_years": 2.5,
            "education": "Degree information or null",
            "summary": "Brief professional summary"
        }}
        
        IMPORTANT: 
        - Return null for any field that cannot be clearly identified
        - Be accurate - don't guess or make up information
        - Extract phone numbers in a clean format
        - For experience_years, estimate based on work history
        """
        
        try:
            response = self.llm.invoke([SystemMessage(content=prompt)])
            result = json.loads(response.content.strip())
            
            # Identify missing required fields
            required_fields = ["name", "email", "phone"]
            missing_fields = [field for field in required_fields if not result.get(field)]
            
            result["missing_fields"] = missing_fields
            result["extraction_successful"] = len(missing_fields) == 0
            
            return result
        except Exception as e:
            return {
                "name": None,
                "email": None,
                "phone": None,
                "skills": [],
                "experience_years": 0,
                "education": None,
                "summary": "Resume parsing failed",
                "missing_fields": ["name", "email", "phone"],
                "extraction_successful": False,
                "error": str(e)
            }

class SummaryGeneratorAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.4
        )
    
    def generate_summary(self, session_data: Dict[str, Any]) -> str:
        """Generate a comprehensive interview summary."""
        
        candidate_info = session_data.get('candidate', {})
        questions = session_data.get('questions', [])
        answers = session_data.get('answers', [])
        total_score = session_data.get('total_score', 0)
        
        qa_pairs = []
        for i, (q, a) in enumerate(zip(questions, answers)):
            qa_pairs.append(f"""
            Q{i+1} ({q.get('difficulty', 'unknown')}): {q.get('question', 'N/A')}
            A{i+1}: {a.get('answer_text', 'No answer provided')}
            Score: {a.get('score', 0)}/10
            Time: {a.get('time_taken', 0)}s / {q.get('time_limit', 0)}s
            """)
        
        prompt = f"""
        You are an expert technical interviewer creating a comprehensive interview summary.
        
        CANDIDATE INFORMATION:
        - Name: {candidate_info.get('name', 'Not provided')}
        - Email: {candidate_info.get('email', 'Not provided')}
        - Phone: {candidate_info.get('phone', 'Not provided')}
        
        INTERVIEW PERFORMANCE:
        - Total Score: {total_score}/10
        - Questions Answered: {len(answers)}/6
        
        QUESTIONS AND ANSWERS:
        {"".join(qa_pairs)}
        
        Create a professional interview summary that includes:
        1. Overall Assessment (2-3 sentences)
        2. Technical Strengths (bullet points)
        3. Areas for Improvement (bullet points)
        4. Communication Skills Assessment
        5. Recommendation (Hire/Don't Hire/Further Review)
        
        Keep it concise but comprehensive. Be professional and constructive.
        """
        
        try:
            response = self.llm.invoke([SystemMessage(content=prompt)])
            return response.content.strip()
        except Exception as e:
            return f"""
            Interview Summary for {candidate_info.get('name', 'Candidate')}
            
            Overall Assessment: The candidate completed the interview process with a total score of {total_score}/10.
            
            Technical Performance:
            • Answered {len(answers)} out of 6 questions
            • Average response quality needs evaluation
            
            Areas to Review:
            • Technical depth and accuracy
            • Problem-solving approach
            • Communication clarity
            
            Recommendation: Requires further review based on complete evaluation.
            
            Note: Detailed AI analysis temporarily unavailable.
            """