#!/usr/bin/env python3
"""Simple test to verify email service doesn't hang the app."""

import sys
import os
import asyncio
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

async def test_email_service():
    """Test the email service with timeout handling."""
    
    print("Testing email service...")
    
    try:
        from app.services.email_service import EmailService
        
        # Test with a timeout
        start_time = datetime.now()
        
        result = await asyncio.wait_for(
            EmailService.send_interview_link(
                candidate_email="test@example.com",
                candidate_name="Test User",
                interview_link="https://example.com/test",
                interviewer_name="Test Interviewer"
            ),
            timeout=10.0  # 10 second total timeout
        )
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"✅ Email service completed in {duration:.2f} seconds")
        print(f"   Result: {'Success' if result else 'Failed'}")
        
    except asyncio.TimeoutError:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"❌ Email service timed out after {duration:.2f} seconds")
        print("   This could cause 502 errors in production")
        
    except Exception as e:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"❌ Email service error after {duration:.2f} seconds: {e}")

if __name__ == "__main__":
    asyncio.run(test_email_service())