from app.core.config import settings
from typing import Dict, Any, List
import json
import cloudinary
import cloudinary.uploader
import requests
from io import BytesIO

# Configure Cloudinary
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET
)

def clean_json_response(response_text: str) -> str:
    """Clean API response by removing markdown code blocks"""
    cleaned_response = response_text.strip()
    if cleaned_response.startswith('```json'):
        cleaned_response = cleaned_response.replace('```json', '').replace('```', '').strip()
    elif cleaned_response.startswith('```'):
        cleaned_response = cleaned_response.replace('```', '').strip()
    return cleaned_response

def call_gemini_api(prompt: str) -> str:
    """Call Gemini API directly using REST API"""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={settings.GEMINI_API_KEY}"

        headers = {
            'Content-Type': 'application/json',
        }

        data = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        response = requests.post(url, headers=headers, json=data, timeout=30)

        print(f"API Request Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"API Response: {result}")
            if 'candidates' in result and len(result['candidates']) > 0:
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                print(f"Extracted text: {text_response[:200]}...")
                return text_response
            else:
                print(f"No candidates in response: {result}")
                raise Exception("No response from Gemini API")
        else:
            print(f"API Error Response: {response.text}")
            raise Exception(f"API Error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"Gemini API call failed: {e}")
        raise e

class ResumeStorageService:
    @staticmethod
    def store_resume(file_content: bytes, filename: str, candidate_name: str = "candidate") -> str:
        """Store resume to Cloudinary and return URL."""
        try:
            # Create a unique public_id based on filename and timestamp
            import time
            timestamp = int(time.time())
            # Clean filename for public_id
            clean_filename = filename.replace('.', '_').replace(' ', '_').lower()
            public_id = f"resumes/{candidate_name.replace(' ', '_').lower()}_{clean_filename}_{timestamp}"

            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                file_content,
                resource_type="raw",  # For non-image files like PDFs
                public_id=public_id,
                folder="interview_resumes"
            )

            return result["secure_url"]
        except Exception as e:
            raise Exception(f"Failed to upload resume: {str(e)}")

    @staticmethod
    def upload_resume(file_content: bytes, filename: str, candidate_name: str) -> Dict[str, str]:
        """Legacy method - use store_resume instead."""
        url = ResumeStorageService.store_resume(file_content, filename, candidate_name)
        return {"url": url, "public_id": "legacy"}

class QuestionGeneratorAgent:
    def __init__(self):
        pass  # No need to initialize model, we'll use REST API

    def generate_question(self, difficulty: str, question_number: int, resume_data: Dict[str, Any], previous_questions: List[str] = []) -> Dict[str, Any]:
        """Generate a question based on difficulty level and resume context."""

        difficulty_config = {
            "easy": {"time_limit": 20, "complexity": "Basic concepts and fundamental knowledge"},
            "medium": {"time_limit": 60, "complexity": "Intermediate problem-solving and practical application"},
            "hard": {"time_limit": 120, "complexity": "Advanced concepts, system design, and complex problem-solving"}
        }

        config = difficulty_config[difficulty]

        # Build context from resume
        resume_context = f"""
        Candidate Resume Summary:
        - Name: {resume_data.get('name', 'Unknown')}
        - Email: {resume_data.get('email', 'Unknown')}
        - Phone: {resume_data.get('phone', 'Unknown')}
        - Experience: {resume_data.get('experience', 'Not specified')}
        - Skills: {resume_data.get('skills', 'Not specified')}
        - Projects: {resume_data.get('projects', 'Not specified')}
        """

        previous_context = ""
        if previous_questions:
            previous_context = f"\nPrevious Questions Asked:\n" + "\n".join(f"- {q}" for q in previous_questions)

        prompt = f"""
        You are an expert technical interviewer for a Full Stack Developer position (React/Node.js).

        Generate Question #{question_number} with {difficulty.upper()} difficulty level.

        Requirements:
        - Difficulty: {difficulty.upper()} - {config['complexity']}
        - Time Limit: {config['time_limit']} seconds
        - Must be relevant to Full Stack Development (React/Node.js)
        - Consider the candidate's background from their resume
        - Avoid repeating previous questions

        {resume_context}
        {previous_context}

        Generate a technical question that tests the candidate's knowledge and is appropriate for their background.
        The question should be clear, specific, and answerable within the time limit.

        Return ONLY a JSON object with this exact structure:
        {{
            "question": "Your question here",
            "difficulty": "{difficulty}",
            "time_limit": {config['time_limit']},
            "category": "Frontend|Backend|Fullstack|General",
            "expected_answer_length": "brief|detailed",
            "evaluation_criteria": ["criterion1", "criterion2", "criterion3"]
        }}
        """

        try:
            response_text = call_gemini_api(prompt)
            # Clean and parse the JSON response
            cleaned_response = clean_json_response(response_text)
            result = json.loads(cleaned_response)
            result["question_number"] = question_number
            return result
        except Exception as e:
            print(f"AI question generation failed: {e}")
            # Fallback question if AI fails
            fallback_questions = {
                "easy": "What is the difference between React functional and class components?",
                "medium": "How would you implement state management in a React application?",
                "hard": "Design a scalable architecture for a real-time chat application using React and Node.js."
            }
            return {
                "question": fallback_questions[difficulty],
                "difficulty": difficulty,
                "time_limit": config["time_limit"],
                "category": "Fullstack",
                "expected_answer_length": "detailed",
                "evaluation_criteria": ["Technical accuracy", "Clear explanation", "Practical understanding"],
                "question_number": question_number
            }

class AnswerEvaluatorAgent:
    def __init__(self):
        pass  # No need to initialize model, we'll use REST API

    def evaluate_answer(self, question: Dict[str, Any], answer: str, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate the candidate's answer using AI."""

        prompt = f"""
        You are an expert technical interviewer evaluating a Full Stack Developer candidate's answer.

        Question Details:
        - Question: {question['question']}
        - Difficulty: {question['difficulty']}
        - Category: {question.get('category', 'General')}
        - Expected Answer Length: {question.get('expected_answer_length', 'detailed')}
        - Evaluation Criteria: {', '.join(question.get('evaluation_criteria', []))}

        Candidate's Answer: "{answer}"

        Candidate Background:
        - Experience: {resume_data.get('experience', 'Not specified')}
        - Skills: {resume_data.get('skills', 'Not specified')}

        Evaluate this answer and provide:
        1. A score from 0-10 (10 being perfect)
        2. Brief feedback explaining the score
        3. What was good about the answer
        4. What could be improved

        Consider:
        - Technical accuracy
        - Depth of understanding
        - Clarity of explanation
        - Relevance to the question
        - Appropriate for the difficulty level

        Return ONLY a JSON object with this exact structure:
        {{
            "score": 7,
            "feedback": "Brief overall feedback",
            "strengths": ["strength1", "strength2"],
            "improvements": ["improvement1", "improvement2"],
            "technical_accuracy": 8,
            "communication": 7,
            "depth": 6
        }}
        """

        try:
            response_text = call_gemini_api(prompt)
            cleaned_response = clean_json_response(response_text)
            result = json.loads(cleaned_response)

            # Ensure score is within bounds
            result["score"] = max(0, min(10, result.get("score", 5)))

            return result
        except Exception as e:
            print(f"AI evaluation failed: {e}")
            # Fallback scoring if AI fails
            return {
                "score": 5,
                "feedback": "Answer received but could not be automatically evaluated.",
                "strengths": ["Response provided"],
                "improvements": ["Could not analyze - please review manually"],
                "technical_accuracy": 5,
                "communication": 5,
                "depth": 5
            }

class ResumeParserAgent:
    def __init__(self):
        pass  # No need to initialize model, we'll use REST API

    def extract_information(self, resume_text: str) -> Dict[str, Any]:
        """Extract structured information from resume text using AI."""

        prompt = f"""
        Extract information from the following resume text. Focus on accuracy and completeness.

        Resume Text:
        {resume_text}

        Extract the following information and return as JSON:
        - name: Full name of the candidate
        - email: Email address
        - phone: Phone number (clean format)
        - experience: Years of experience or experience level
        - skills: List of technical skills (especially React, Node.js, JavaScript, etc.)
        - education: Educational background
        - projects: Brief description of key projects
        - current_position: Current job title/position
        - missing_fields: List of fields that are missing or unclear from the resume

        Return ONLY a JSON object with this exact structure:
        {{
            "name": "Full Name or null",
            "email": "email@example.com or null",
            "phone": "+1234567890 or null",
            "experience": "X years or entry-level or null",
            "skills": ["skill1", "skill2"] or [],
            "education": "Degree details or null",
            "projects": "Project descriptions or null",
            "current_position": "Job title or null",
            "missing_fields": ["field1", "field2"]
        }}
        """

        try:
            response_text = call_gemini_api(prompt)
            print(f"Resume parsing response: {response_text[:500]}...")

            if not response_text or response_text.strip() == "":
                raise Exception("Empty response from API")

            # Clean up the response - remove markdown code blocks if present
            cleaned_response = clean_json_response(response_text)
            print(f"Cleaned response: {cleaned_response[:300]}...")
            result = json.loads(cleaned_response)

            # Identify missing required fields
            required_fields = ["name", "email", "phone"]
            missing = []
            for field in required_fields:
                if not result.get(field) or result[field] == "null" or result[field] is None:
                    missing.append(field)

            result["missing_fields"] = missing
            return result

        except json.JSONDecodeError as e:
            print(f"JSON parsing failed: {e}")
            print(f"Raw response was: {response_text}")
            return {
                "name": None,
                "email": None,
                "phone": None,
                "experience": None,
                "skills": [],
                "education": None,
                "projects": None,
                "current_position": None,
                "missing_fields": ["name", "email", "phone"]
            }
        except Exception as e:
            print(f"AI resume parsing failed: {e}")
            return {
                "name": None,
                "email": None,
                "phone": None,
                "experience": None,
                "skills": [],
                "education": None,
                "projects": None,
                "current_position": None,
                "missing_fields": ["name", "email", "phone"]
            }

class InterviewSummaryAgent:
    def __init__(self):
        pass  # No need to initialize model, we'll use REST API

    def generate_summary(self, candidate_data: Dict[str, Any], questions_and_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate final interview summary and overall score."""

        # Calculate overall score from individual question scores
        total_score = 0
        total_questions = len(questions_and_answers)

        qa_summary = ""
        for i, qa in enumerate(questions_and_answers, 1):
            score = qa.get('evaluation', {}).get('score', 0)
            total_score += score
            qa_summary += f"Q{i} ({qa['question']['difficulty']}): {score}/10\n"

        overall_score = round(total_score / total_questions, 1) if total_questions > 0 else 0

        prompt = f"""
        Generate a comprehensive interview summary for a Full Stack Developer candidate.

        Candidate Information:
        - Name: {candidate_data.get('name', 'Unknown')}
        - Experience: {candidate_data.get('experience', 'Not specified')}
        - Skills: {candidate_data.get('skills', [])}

        Interview Performance:
        {qa_summary}
        Overall Score: {overall_score}/10

        Question and Answer Details:
        {json.dumps(questions_and_answers, indent=2)}

        Generate a professional summary that includes:
        1. Overall performance assessment
        2. Technical strengths identified
        3. Areas for improvement
        4. Recommendation (Hire/Consider/Reject)
        5. Key highlights from the interview

        Return ONLY a JSON object with this structure:
        {{
            "overall_score": {overall_score},
            "recommendation": "Hire|Consider|Reject",
            "summary": "2-3 sentence overall assessment",
            "strengths": ["strength1", "strength2", "strength3"],
            "weaknesses": ["weakness1", "weakness2"],
            "technical_assessment": "Technical skills evaluation",
            "communication_skills": "Communication assessment",
            "next_steps": "Recommended next steps"
        }}
        """

        try:
            response_text = call_gemini_api(prompt)
            cleaned_response = clean_json_response(response_text)
            result = json.loads(cleaned_response)
            result["overall_score"] = overall_score
            return result
        except Exception as e:
            print(f"AI summary generation failed: {e}")
            return {
                "overall_score": overall_score,
                "recommendation": "Consider" if overall_score >= 6 else "Reject",
                "summary": f"Candidate completed interview with an overall score of {overall_score}/10.",
                "strengths": ["Completed all questions"],
                "weaknesses": ["Could not generate detailed analysis"],
                "technical_assessment": "Requires manual review",
                "communication_skills": "Requires manual review",
                "next_steps": "Manual review recommended"
            }

# Legacy aliases for backward compatibility
SummaryGeneratorAgent = InterviewSummaryAgent