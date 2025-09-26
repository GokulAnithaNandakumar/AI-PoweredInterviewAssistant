import os
import asyncio
import logging
from email.message import EmailMessage
from aiosmtplib import SMTP
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.smtp_user = settings.MAIL_USERNAME
        self.smtp_password = settings.MAIL_PASSWORD
        self.mail_from = settings.MAIL_FROM
        self.mail_from_name = settings.MAIL_FROM_NAME

    async def _send_email(self, to_email: str, subject: str, body: str, html_body: str = None):
        """Send email using aiosmtplib with proper error handling."""
        try:
            msg = EmailMessage()
            msg["From"] = f"{self.mail_from_name} <{self.mail_from}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            
            # Set both plain text and HTML content
            msg.set_content(body)
            if html_body:
                msg.add_alternative(html_body, subtype='html')

            # Try STARTTLS first (port 587)
            try:
                async with SMTP(
                    hostname=self.smtp_host, 
                    port=self.smtp_port, 
                    start_tls=True,
                    timeout=15.0  # 15 second timeout
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    logger.info(f"✅ Email sent successfully to {to_email} via STARTTLS")
                    return True
                    
            except Exception as e:
                logger.warning(f"⚠️ STARTTLS failed for {to_email}, trying SSL: {str(e)}")
                
                # Try SSL as fallback (port 465)
                async with SMTP(
                    hostname=self.smtp_host,
                    port=465,
                    use_tls=True,  # Use SSL instead of STARTTLS
                    timeout=15.0
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    logger.info(f"✅ Email sent successfully to {to_email} via SSL")
                    return True

        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False

    @staticmethod
    async def send_interview_link(
        candidate_email: str,
        candidate_name: str,
        interview_link: str,
        interviewer_name: str = "AI Interview Team"
    ):
        """Send interview link to candidate via email using aiosmtplib."""

        logger.info(f"Sending interview email to {candidate_email}")

        # Create email service instance
        email_service = EmailService()

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
            # Use the new aiosmtplib implementation with timeout
            result = await asyncio.wait_for(
                email_service._send_email(
                    to_email=candidate_email,
                    subject="🎯 Your AI Interview Invitation - Get Started Now!",
                    body=text_body,
                    html_body=html_body
                ),
                timeout=20.0  # Overall 20 second timeout
            )
            
            if result:
                logger.info(f"✅ Email sent successfully to {candidate_email}")
                return True
            else:
                logger.warning(f"⚠️ Email failed to send to {candidate_email}")
                # Log the interview link for manual sharing
                logger.info(f"📧 Interview link for {candidate_email}: {interview_link}")
                return False

        except asyncio.TimeoutError:
            logger.error(f"⏰ Email operation timed out for {candidate_email}")
            logger.info(f"📧 Interview link for {candidate_email}: {interview_link}")
            return False

        except Exception as e:
            logger.error(f"❌ Failed to send email to {candidate_email}: {str(e)}")
            logger.info(f"📧 Interview link for {candidate_email}: {interview_link}")
            return False