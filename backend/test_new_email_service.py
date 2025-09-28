#!/usr/bin/env python3
"""Test the new SendGrid + SMTP email service"""

import sys
import os
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

import asyncio
import logging
from app.services.email_service import EmailService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')

async def test_email_service():
    """Test the email service with fallback logic"""
    print("🧪 Testing new SendGrid + SMTP email service...")

    # Test parameters
    test_email = "gokul.nandakumar04@gmail.com"
    test_name = "Test User"
    test_link = "http://localhost:3000/interview/test-session-123"

    try:
        print(f"📧 Sending test email to {test_email}")

        # Test the email service
        success = await EmailService.send_interview_link(
            candidate_email=test_email,
            candidate_name=test_name,
            interview_link=test_link,
            interviewer_name="Test Interviewer"
        )

        if success:
            print("✅ Email service test PASSED!")
            print("🎉 Email delivery successful")
        else:
            print("❌ Email service test FAILED!")
            print("💡 Check logs above for specific errors")

        return success

    except Exception as e:
        print(f"🚨 Email service test ERROR: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting email service test...")
    result = asyncio.run(test_email_service())
    print(f"\n📊 Final result: {'SUCCESS' if result else 'FAILED'}")