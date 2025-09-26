import os
import asyncio
import logging
import smtplib
from typing import Optional
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from aiosmtplib import SMTP
import ssl
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

    async def send_email_async_method1(self, to_email: str, subject: str, body: str):
        """Method 1: Async SMTP with STARTTLS (Port 587) - 60s timeout"""
        try:
            msg = EmailMessage()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content(body, subtype='html')

            logger.info(f"📧 Method 1: Trying async SMTP STARTTLS (587) to {to_email}...")

            async with SMTP(hostname=self.smtp_host, port=587, start_tls=True, timeout=60) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(msg)

            logger.info(f"✅ Method 1 SUCCESS: Email sent to {to_email}")
            return True

        except Exception as e:
            logger.warning(f"⚠️ Method 1 FAILED: {str(e)}")
            return False

    async def send_email_async_method2(self, to_email: str, subject: str, body: str):
        """Method 2: Async SMTP with SSL (Port 465) - 60s timeout"""
        try:
            msg = EmailMessage()
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content(body, subtype='html')

            logger.info(f"📧 Method 2: Trying async SMTP SSL (465) to {to_email}...")

            async with SMTP(hostname=self.smtp_host, port=465, use_tls=True, timeout=60) as smtp:
                await smtp.login(self.smtp_user, self.smtp_password)
                await smtp.send_message(msg)

            logger.info(f"✅ Method 2 SUCCESS: Email sent to {to_email}")
            return True

        except Exception as e:
            logger.warning(f"⚠️ Method 2 FAILED: {str(e)}")
            return False

    def send_email_sync_method3(self, to_email: str, subject: str, body: str):
        """Method 3: Synchronous SMTP with STARTTLS (Port 587) - blocking"""
        try:
            msg = MIMEMultipart('alternative')
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject

            # Add HTML content
            html_part = MIMEText(body, 'html')
            msg.attach(html_part)

            logger.info(f"📧 Method 3: Trying sync SMTP STARTTLS (587) to {to_email}...")

            # Create SMTP connection with extended timeout
            server = smtplib.SMTP(self.smtp_host, 587, timeout=120)
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()

            logger.info(f"✅ Method 3 SUCCESS: Email sent to {to_email}")
            return True

        except Exception as e:
            logger.warning(f"⚠️ Method 3 FAILED: {str(e)}")
            return False

    def send_email_sync_method4(self, to_email: str, subject: str, body: str):
        """Method 4: Synchronous SMTP with SSL (Port 465) - blocking"""
        try:
            msg = MIMEMultipart('alternative')
            msg["From"] = self.smtp_user
            msg["To"] = to_email
            msg["Subject"] = subject

            # Add HTML content
            html_part = MIMEText(body, 'html')
            msg.attach(html_part)

            logger.info(f"📧 Method 4: Trying sync SMTP SSL (465) to {to_email}...")

            # Create SSL context
            context = ssl.create_default_context()

            # Create SMTP connection with SSL
            server = smtplib.SMTP_SSL(self.smtp_host, 465, context=context, timeout=120)
            server.login(self.smtp_user, self.smtp_password)
            server.send_message(msg)
            server.quit()

            logger.info(f"✅ Method 4 SUCCESS: Email sent to {to_email}")
            return True

        except Exception as e:
            logger.warning(f"⚠️ Method 4 FAILED: {str(e)}")
            return False

    async def send_email(self, to_email: str, subject: str, body: str):
        """Send email using multiple fallback methods with extended timeouts"""

        # Method 1: Async SMTP STARTTLS (Port 587) - 60s timeout
        try:
            result = await asyncio.wait_for(
                self.send_email_async_method1(to_email, subject, body),
                timeout=65.0
            )
            if result:
                return True
        except asyncio.TimeoutError:
            logger.warning("⏰ Method 1 timed out after 65 seconds")
        except Exception as e:
            logger.warning(f"⚠️ Method 1 error: {e}")

        # Method 2: Async SMTP SSL (Port 465) - 60s timeout
        try:
            result = await asyncio.wait_for(
                self.send_email_async_method2(to_email, subject, body),
                timeout=65.0
            )
            if result:
                return True
        except asyncio.TimeoutError:
            logger.warning("⏰ Method 2 timed out after 65 seconds")
        except Exception as e:
            logger.warning(f"⚠️ Method 2 error: {e}")

        # Method 3: Sync SMTP STARTTLS (Port 587) - 120s timeout
        try:
            result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, self.send_email_sync_method3, to_email, subject, body
                ),
                timeout=125.0
            )
            if result:
                return True
        except asyncio.TimeoutError:
            logger.warning("⏰ Method 3 timed out after 125 seconds")
        except Exception as e:
            logger.warning(f"⚠️ Method 3 error: {e}")

        # Method 4: Sync SMTP SSL (Port 465) - 120s timeout
        try:
            result = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, self.send_email_sync_method4, to_email, subject, body
                ),
                timeout=125.0
            )
            if result:
                return True
        except asyncio.TimeoutError:
            logger.warning("⏰ Method 4 timed out after 125 seconds")
        except Exception as e:
            logger.warning(f"⚠️ Method 4 error: {e}")

        # All methods failed
        logger.error(f"❌ ALL EMAIL METHODS FAILED for {to_email}")
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