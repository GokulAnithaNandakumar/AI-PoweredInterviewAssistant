#!/usr/bin/env python3
"""Test the complete email integration with the API."""

import sys
import os
import asyncio

# Add the backend directory to the Python path
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

async def test_api_integration():
    """Test that the email service integrates correctly with the API."""

    print("Testing API integration with new email service...")

    try:
        # Test the session creation flow
        from app.services.email_service import EmailService

        # Create an instance and test the static method
        result = await EmailService.send_interview_link(
            candidate_email="integration.test@example.com",
            candidate_name="Integration Test User",
            interview_link="http://localhost:3000/interview/test_token",
            interviewer_name="Test Interviewer"
        )

        print(f"API integration test result: {'✅ Success' if result else '❌ Failed'}")

        # Test that it doesn't hang
        start_time = asyncio.get_event_loop().time()

        # Test with timeout to ensure it doesn't hang
        result2 = await asyncio.wait_for(
            EmailService.send_interview_link(
                candidate_email="timeout.test@example.com",
                candidate_name="Timeout Test",
                interview_link="https://example.com/test",
                interviewer_name="Test"
            ),
            timeout=25.0  # 25 second timeout
        )

        end_time = asyncio.get_event_loop().time()
        duration = end_time - start_time

        print(f"Timeout test completed in {duration:.2f}s: {'✅ Success' if result2 else '❌ Failed'}")

        if duration < 20.0:  # Should complete within 20 seconds
            print("✅ Email service is fast enough to prevent 502 errors")
        else:
            print("⚠️ Email service might be too slow for production")

    except Exception as e:
        print(f"❌ API integration test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api_integration())