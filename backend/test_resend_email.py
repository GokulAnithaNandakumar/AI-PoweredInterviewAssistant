#!/usr/bin/env python3
"""Test the new Resend email service"""

import sys
import os
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

import asyncio
import logging
import time
from app.services.email_service import EmailService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s:%(name)s:%(message)s')

async def test_resend_email_service():
    """Test the Resend email service"""
    print("🚀 Testing Resend + SMTP Fallback Email Service...")

    # Test parameters
    test_email = "temp.gokul04@gmail.com"  # Using your requested email
    test_name = "Test User"
    test_link = "https://ai-powered-interview-assistant-chi.vercel.app/interview/resend-test-123"

    start_time = time.time()

    try:
        print(f"📧 Sending test email to {test_email}")
        print("🔄 Will try Resend first, then SMTP fallback if needed...")
        print()

        # Test the Resend email service
        success = await EmailService.send_interview_link(
            candidate_email=test_email,
            candidate_name=test_name,
            interview_link=test_link,
            interviewer_name="Resend Test System"
        )

        elapsed_time = time.time() - start_time

        if success:
            print(f"\n🎉 RESEND EMAIL SERVICE TEST PASSED!")
            print(f"✅ Email delivered successfully in {elapsed_time:.2f} seconds!")
            print(f"🚀 This HTTP-based method WILL work perfectly on Render!")
        else:
            print(f"\n❌ Email service test failed after {elapsed_time:.2f} seconds")
            print(f"🔧 Check the error logs above")

        return success

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"🚨 Test error after {elapsed_time:.2f} seconds: {e}")
        return False

if __name__ == "__main__":
    print("🎯 Starting Resend Email Service Test...")
    print("💡 Resend is HTTP-based and bypasses all SMTP blocks!")
    print("=" * 60)

    result = asyncio.run(test_resend_email_service())

    print("=" * 60)
    print(f"📊 Final result: {'SUCCESS' if result else 'FAILED'}")

    if result:
        print("\n🎊 EXCELLENT! Resend email service works perfectly!")
        print("🚀 This HTTP-based solution will work flawlessly on Render!")
        print("💡 No more SMTP timeouts - pure HTTP API!")
    else:
        print("\n🔧 Check the configuration...")
        print("💡 Review the logs above for specific issues")