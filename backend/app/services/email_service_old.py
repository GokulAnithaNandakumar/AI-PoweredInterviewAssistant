import os
import asyncio
import logging
from typing import Optional
import json
import aiohttp
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Subject, HtmlContent, PlainTextContent
from email.message import EmailMessage
from aiosmtplib import SMTP
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # SMTP Configuration (fallback for local)
        self.smtp_host = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.smtp_user = settings.MAIL_USERNAME
        self.smtp_password = settings.MAIL_PASSWORD
        self.mail_from = settings.MAIL_FROM
        self.mail_from_name = settings.MAIL_FROM_NAME
        
        # SendGrid Configuration (primary for production)
        self.sendgrid_api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        self.sendgrid_client = None
        
        if self.sendgrid_api_key:
            try:
                self.sendgrid_client = SendGridAPIClient(api_key=self.sendgrid_api_key)
                logger.info("✅ SendGrid client initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️ SendGrid initialization failed: {e}")

    async def _send_via_sendgrid(self, to_email: str, subject: str, html_body: str, text_body: str = None):
        """Send email via SendGrid HTTP API (works on Render)"""
        if not self.sendgrid_client:
            logger.error("SendGrid client not available")
            return False
            
        try:
            # Create mail object
            from_email = From(self.mail_from, self.mail_from_name)
            to_email_obj = To(to_email)
            subject_obj = Subject(subject)
            html_content = HtmlContent(html_body)
            
            mail = Mail(
                from_email=from_email,
                to_emails=to_email_obj,
                subject=subject_obj,
                html_content=html_content
            )
            
            if text_body:
                plain_text_content = PlainTextContent(text_body)
                mail.plain_text_content = plain_text_content

            # Send the email
            response = self.sendgrid_client.send(mail)
            
            if response.status_code in [200, 202]:
                logger.info(f"✅ SendGrid email sent successfully to {to_email}. Status: {response.status_code}")
                return True
            else:
                logger.error(f"❌ SendGrid failed with status {response.status_code}: {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"❌ SendGrid error: {str(e)}")
            return False

    async def _send_via_smtp(self, to_email: str, subject: str, body: str, html_body: str = None):
        """Send email using SMTP (fallback for local development)"""
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
                    timeout=10.0  # Reduced timeout for faster fallback
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    logger.info(f"✅ SMTP email sent successfully to {to_email} via STARTTLS")
                    return True
                    
            except Exception as e:
                logger.warning(f"⚠️ STARTTLS failed for {to_email}, trying SSL: {str(e)}")
                
                # Try SSL as fallback (port 465)
                async with SMTP(
                    hostname=self.smtp_host,
                    port=465,
                    use_tls=True,  # Use SSL instead of STARTTLS
                    timeout=10.0
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    logger.info(f"✅ SMTP email sent successfully to {to_email} via SSL")
                    return True

        except Exception as e:
            logger.error(f"❌ SMTP failed to send email to {to_email}: {str(e)}")
            return False

    async def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str = None):
        """Primary email sending method with SendGrid first, SMTP fallback"""
        
        # Try SendGrid first (HTTP API - works on Render)
        if self.sendgrid_client:
            logger.info(f"📧 Attempting to send email via SendGrid to {to_email}")
            success = await self._send_via_sendgrid(to_email, subject, html_body, text_body)
            if success:
                return True
            else:
                logger.warning("SendGrid failed, trying SMTP fallback...")
        
        # Fallback to SMTP (for local development)
        logger.info(f"📧 Attempting to send email via SMTP to {to_email}")
        return await self._send_via_smtp(to_email, subject, text_body or "Interview Invitation", html_body)

    @staticmethod
    async def send_interview_link(
        candidate_email: str,
        candidate_name: str,
        interview_link: str,
        interviewer_name: str = "AI Interview Team"
    ):
        """Send interview link to candidate via email using SendGrid + SMTP fallback."""

        logger.info(f"🚀 Sending interview email to {candidate_email}")

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
        """

        # Create plain text version for better compatibility
        text_body = f"""
        AI Interview Assistant - Interview Invitation

        Hello {candidate_name},

        Congratulations! You've been invited to participate in an AI-powered technical interview.

        What to expect:
        - AI-powered interview questions tailored to your profile
        - Timed responses to assess your problem-solving speed
        - Dynamic difficulty adjustment based on your answers
        - Real-time evaluation and feedback

        Please click the link below to begin your interview:
        {interview_link}

        Note: Please ensure you have a stable internet connection and are in a quiet environment before starting the interview.

        Best regards,
        {interviewer_name}

        ---
        This is an automated message from the AI Interview Assistant.
        """

        # Send the email
        success = await email_service._send_email(
            to_email=candidate_email,
            subject="🎯 Your AI Interview Invitation - Ready to Start!",
            html_body=html_body,
            text_body=text_body
        )
        
        if success:
            logger.info(f"✅ Interview invitation sent successfully to {candidate_email}")
        else:
            logger.error(f"❌ Failed to send interview invitation to {candidate_email}")
            
        return success


# Create singleton instance
email_service = EmailService()