import os
import asyncio
import logging
from typing import Optional
from email.message import EmailMessage
from aiosmtplib import SMTP
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # SMTP Configuration - using your proven working approach
        self.smtp_host = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.smtp_user = settings.MAIL_USERNAME
        self.smtp_password = settings.MAIL_PASSWORD
        self.mail_from = settings.MAIL_FROM
        self.mail_from_name = settings.MAIL_FROM_NAME
        
        logger.info(f"📧 Email service initialized:")
        logger.info(f"   SMTP Host: {self.smtp_host}:{self.smtp_port}")
        logger.info(f"   From: {self.mail_from}")

    async def send_email(self, to_email: str, subject: str, body: str):
        """Send email using SMTP - your proven working method"""
        try:
            msg = EmailMessage()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content(body, subtype='html')
            
            logger.info(f"📧 Sending email to {to_email} via SMTP...")
            
            async with SMTP(hostname=self.smtp_host, port=self.smtp_port, start_tls=True, timeout=30) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(msg)
                
            logger.info(f"✅ Email sent successfully to {to_email}")
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
        """Send interview link to candidate via email using proven SMTP method."""

        logger.info(f"🚀 Sending interview email to {candidate_email}")

        # Create email service instance
        email_service = EmailService()

        # Create HTML body for email
        html_body = f'''
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
                    <p>Hello <span class="highlight">{candidate_name}</span>,</p>
                    
                    <p>Congratulations! You've been invited to participate in an AI-powered technical interview. Our intelligent system will guide you through a comprehensive assessment designed to evaluate your skills and capabilities.</p>
                    
                    <p><strong>What to expect:</strong></p>
                    <ul>
                        <li>🤖 AI-powered interview questions tailored to your profile</li>
                        <li>⏱️ Timed responses to assess your problem-solving speed</li>
                        <li>💡 Dynamic difficulty adjustment based on your answers</li>
                        <li>📊 Real-time evaluation and feedback</li>
                    </ul>
                    
                    <p>Click the button below to begin your interview:</p>
                    
                    <div style="text-align: center;">
                        <a href="{interview_link}" class="cta-button">Start Interview Now</a>
                    </div>
                    
                    <p><strong>Note:</strong> Please ensure you have a stable internet connection and are in a quiet environment before starting the interview.</p>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #1976d2;">{interview_link}</p>
                </div>

                <div class="footer">
                    <p>Best regards,<br><strong>{interviewer_name}</strong></p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p><em>This is an automated message from the AI Interview Assistant. Please do not reply to this email.</em></p>
                </div>
            </div>
        </body>
        </html>
        '''

        # Send the email using your proven method
        success = await email_service.send_email(
            to_email=candidate_email,
            subject="🎯 Your AI Interview Invitation - Ready to Start!",
            body=html_body
        )
        
        if success:
            logger.info(f"✅ Interview invitation sent successfully to {candidate_email}")
        else:
            logger.error(f"❌ Failed to send interview invitation to {candidate_email}")
            
        return success

# Create singleton instance
email_service = EmailService()