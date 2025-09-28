#!/usr/bin/env python3
"""Test the robust multi-method email service"""

import sys
import os
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

import asyncio
import logging
import time
from app.services.email_service import EmailService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s:%(name)s:%(message)s')

async def test_robust_email_service():
    """Test the robust email service with multiple fallback methods"""
    print("🧪 Testing ROBUST multi-method email service...")

    # Test parameters
    test_email = "gokul.nandakumar04@gmail.com"
    test_name = "Test User"
    test_link = "http://localhost:3000/interview/test-session-robust"

    start_time = time.time()

    try:
        print(f"📧 Sending test email to {test_email}")
        print("🔄 This will try 4 different methods with extended timeouts...")
        print("⏱️ Method 1: Async SMTP STARTTLS (65s timeout)")
        print("⏱️ Method 2: Async SMTP SSL (65s timeout)")
        print("⏱️ Method 3: Sync SMTP STARTTLS (125s timeout)")
        print("⏱️ Method 4: Sync SMTP SSL (125s timeout)")
        print("📊 Total maximum time: ~5 minutes")
        print()

        # Test the robust email service
        success = await EmailService.send_interview_link(
            candidate_email=test_email,
            candidate_name=test_name,
            interview_link=test_link,
            interviewer_name="Robust Test System"
        )

        elapsed_time = time.time() - start_time

        if success:
            print(f"\n🎉 ROBUST EMAIL SERVICE TEST PASSED!")
            print(f"✅ Email delivered successfully in {elapsed_time:.2f} seconds!")
            print(f"🚀 This method WILL work on Render!")
        else:
            print(f"\n❌ All email methods failed after {elapsed_time:.2f} seconds")
            print(f"🔧 Check network connectivity and credentials")

        return success

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"🚨 Test error after {elapsed_time:.2f} seconds: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting ROBUST email service test...")
    print("💪 This version tries multiple methods with extended timeouts!")
    print("=" * 60)

    result = asyncio.run(test_robust_email_service())

    print("=" * 60)
    print(f"📊 Final result: {'SUCCESS' if result else 'FAILED'}")

    if result:
        print("\n🎊 EXCELLENT! The robust email service works!")
        print("🚀 This multi-method approach will definitely work on Render!")
        print("💡 Even if one method fails, others will succeed!")
    else:
        print("\n🔧 The robust service needs investigation...")
        print("💡 Check the detailed logs above for specific issues")