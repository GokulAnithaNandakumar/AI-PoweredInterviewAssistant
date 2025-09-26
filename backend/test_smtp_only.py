#!/usr/bin/env python3
"""Test SMTP email service without SendGrid dependency"""

import sys
import os
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

import asyncio
import logging
from email.message import EmailMessage
from aiosmtplib import SMTP

# Mock settings for testing
class MockSettings:
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "")
    MAIL_FROM_NAME = "AI Interview Assistant"
    SENDGRID_API_KEY = None

settings = MockSettings()

# Simple SMTP-only email service for testing
class SimpleEmailService:
    def __init__(self):
        self.smtp_host = settings.MAIL_SERVER
        self.smtp_port = settings.MAIL_PORT
        self.smtp_user = settings.MAIL_USERNAME
        self.smtp_password = settings.MAIL_PASSWORD
        self.mail_from = settings.MAIL_FROM
        self.mail_from_name = settings.MAIL_FROM_NAME

    async def send_test_email(self, to_email: str):
        """Send a simple test email via SMTP"""
        try:
            msg = EmailMessage()
            msg["From"] = f"{self.mail_from_name} <{self.mail_from}>"
            msg["To"] = to_email
            msg["Subject"] = "🧪 Test Email - AI Interview Assistant"

            # Simple HTML content
            html_content = """
            <html>
            <body>
                <h2>🎯 AI Interview Assistant - Test Email</h2>
                <p>This is a test email to verify SMTP connectivity.</p>
                <p>If you receive this, the email service is working! ✅</p>
                <hr>
                <p><em>This is an automated test message.</em></p>
            </body>
            </html>
            """

            msg.set_content("Test email from AI Interview Assistant")
            msg.add_alternative(html_content, subtype='html')

            # Try STARTTLS first
            try:
                async with SMTP(
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    start_tls=True,
                    timeout=15.0
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    print(f"✅ SMTP email sent successfully to {to_email} via STARTTLS")
                    return True

            except Exception as e:
                print(f"⚠️ STARTTLS failed: {e}")
                print("🔄 Trying SSL fallback...")

                # Try SSL as fallback
                async with SMTP(
                    hostname=self.smtp_host,
                    port=465,
                    use_tls=True,
                    timeout=15.0
                ) as smtp:
                    await smtp.login(self.smtp_user, self.smtp_password)
                    await smtp.send_message(msg)
                    print(f"✅ SMTP email sent successfully to {to_email} via SSL")
                    return True

        except Exception as e:
            print(f"❌ SMTP failed: {e}")
            return False

async def test_smtp_only():
    """Test SMTP email sending"""
    print("🧪 Testing SMTP email service...")

    # Check if credentials are available
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print("❌ Email credentials not found in environment variables")
        print("💡 Set MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM")
        return False

    print(f"📧 Using SMTP: {settings.MAIL_SERVER}:{settings.MAIL_PORT}")
    print(f"👤 From: {settings.MAIL_FROM}")

    email_service = SimpleEmailService()
    test_email = "gokul.nandakumar04@gmail.com"

    try:
        success = await email_service.send_test_email(test_email)

        if success:
            print("🎉 SMTP email test PASSED!")
        else:
            print("❌ SMTP email test FAILED!")

        return success

    except Exception as e:
        print(f"🚨 Test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting SMTP email test...")
    result = asyncio.run(test_smtp_only())
    print(f"\n📊 Final result: {'SUCCESS' if result else 'FAILED'}")

    if result:
        print("\n✅ Email service is working locally!")
        print("💡 Now you can add SendGrid for production deployment on Render")
    else:
        print("\n❌ Email service needs configuration")
        print("💡 Check your Gmail app password and environment variables")