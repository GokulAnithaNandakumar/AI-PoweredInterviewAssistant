from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.core.config import settings
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Email configuration with timeout and retry settings
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    TEMPLATE_FOLDER=Path(__file__).parent / "templates",
    # Add timeout settings for Render deployment
    TIMEOUT=60  # 60 second timeout instead of default
)

class EmailService:
    @staticmethod
    async def send_interview_link(
        candidate_email: str,
        candidate_name: str,
        interview_link: str,
        interviewer_name: str = "AI Interview Team"
    ):
        """Send interview link to candidate via email."""

        logger.info(f"Sending interview email to {candidate_email}")

        # Create HTML body for email
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Interview Invitation - AI Interview Assistant</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                }}
                .container {{
                    background-color: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 2em;
                    margin-bottom: 10px;
                }}
                .title {{
                    color: #1976d2;
                    font-size: 1.5em;
                    margin: 0;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .cta-button {{
                    display: inline-block;
                    background-color: #1976d2;
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 5px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 0.9em;
                }}
                .highlight {{
                    color: #1976d2;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎯</div>
                    <h1 class="title">AI Interview Assistant</h1>
                    <p>Your AI-Powered Technical Interview</p>
                </div>

                <div class="content">
                    <h2>Hello {candidate_name},</h2>

                    <p>You have been invited to participate in a technical interview powered by AI.</p>

                    <div style="text-align: center;">
                        <a href="{interview_link}" class="cta-button">Start Your Interview</a>
                    </div>

                    <p><strong>Interview Structure:</strong></p>
                    <ul>
                        <li>Upload your resume (PDF or DOCX format)</li>
                        <li>Answer 6 timed questions</li>
                        <li>Get AI-powered evaluation</li>
                    </ul>

                    <p>Good luck with your interview!</p>

                    <p>Best regards,<br>
                    <strong>{interviewer_name}</strong><br>
                    AI Interview Assistant Team</p>
                </div>

                <div class="footer">
                    <p>Interview Link: <a href="{interview_link}">{interview_link}</a></p>
                    <p>© 2024 AI Interview Assistant. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text version
        text_body = f"""
        Hello {candidate_name},

        You have been invited to participate in a technical interview powered by AI.

        Interview Link: {interview_link}

        Instructions:
        1. Click the link above to access your interview
        2. Have your resume ready (PDF or DOCX format)
        3. Answer 6 timed questions
        4. Get AI-powered evaluation

        Good luck with your interview!

        Best regards,
        {interviewer_name}
        AI Interview Assistant Team
        """

        try:
            # Create message
            message = MessageSchema(
                subject="🎯 Your AI Interview Invitation - Get Started Now!",
                recipients=[candidate_email],
                body=text_body,
                html=html_body,
                subtype="html"
            )

            # Initialize FastMail with the configuration
            fm = FastMail(conf)

            # Try to send the email with retry logic
            import asyncio
            
            try:
                # Send with timeout
                await asyncio.wait_for(fm.send_message(message), timeout=30.0)
                logger.info(f"✅ Email sent successfully to {candidate_email}")
                return True
                
            except asyncio.TimeoutError:
                logger.error(f"❌ Email timeout for {candidate_email} - trying alternative configuration")
                
                # Try alternative configuration (SSL instead of STARTTLS)
                alt_conf = ConnectionConfig(
                    MAIL_USERNAME=settings.MAIL_USERNAME,
                    MAIL_PASSWORD=settings.MAIL_PASSWORD,
                    MAIL_FROM=settings.MAIL_FROM,
                    MAIL_PORT=465,  # SSL port
                    MAIL_SERVER=settings.MAIL_SERVER,
                    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
                    MAIL_STARTTLS=False,
                    MAIL_SSL_TLS=True,  # Use SSL instead
                    USE_CREDENTIALS=True,
                    TEMPLATE_FOLDER=Path(__file__).parent / "templates"
                )
                
                fm_alt = FastMail(alt_conf)
                await asyncio.wait_for(fm_alt.send_message(message), timeout=30.0)
                logger.info(f"✅ Email sent successfully to {candidate_email} (via SSL)")
                return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {candidate_email}: {str(e)}")
            
            # Log the interview link so it can be manually shared if email fails
            logger.info(f"📧 Interview link for {candidate_email}: {interview_link}")
            
            # Don't raise the exception - let the session creation succeed even if email fails
            return False