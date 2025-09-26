#!/usr/bin/env python3
"""Test the config parsing to make sure it works correctly."""

import sys
import os

# Add the backend directory to the Python path
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

# Set test environment variables
os.environ['CORS_ORIGINS'] = 'https://example.com,https://ai-powered-interview-assistant-chi.vercel.app,https://test.com'
os.environ['WEBSOCKET_ORIGINS'] = 'https://example.com,https://ai-powered-interview-assistant-chi.vercel.app'

try:
    from app.core.config import settings

    print("Testing CORS_ORIGINS parsing...")
    cors_origins = settings.get_cors_origins()
    print(f"CORS Origins: {cors_origins}")
    print(f"Type: {type(cors_origins)}")

    print("\nTesting WEBSOCKET_ORIGINS parsing...")
    websocket_origins = settings.get_websocket_origins()
    print(f"WebSocket Origins: {websocket_origins}")
    print(f"Type: {type(websocket_origins)}")

    print("\n✅ Configuration parsing successful!")

except Exception as e:
    print(f"❌ Configuration parsing failed: {e}")
    import traceback
    traceback.print_exc()