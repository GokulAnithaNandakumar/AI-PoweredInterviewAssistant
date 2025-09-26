#!/usr/bin/env python3
"""Test that the FastAPI app can start without configuration errors."""

import sys
import os
import traceback

# Add the backend directory to the Python path
sys.path.append('/Users/gokulnandakumar/Developer/github_push/AI-PoweredInterviewAssistant/backend')

# Set test environment variables to simulate Render
os.environ['CORS_ORIGINS'] = 'https://ai-powered-interview-assistant-chi.vercel.app,http://localhost:3000'
os.environ['WEBSOCKET_ORIGINS'] = 'https://ai-powered-interview-assistant-chi.vercel.app,http://localhost:3000'
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['SECRET_KEY'] = 'test-secret-key-for-deployment'
os.environ['GEMINI_API_KEY'] = 'test-api-key'

print("Testing FastAPI app initialization...")

try:
    # Test configuration loading
    from app.core.config import settings
    print("✅ Configuration loaded successfully")
    print(f"   CORS Origins: {settings.get_cors_origins()}")
    print(f"   Database URL: {settings.DATABASE_URL[:50]}...")
    
    # Test app creation (but don't actually start the server)
    print("\nTesting FastAPI app creation...")
    
    # Mock the database operations that might fail
    from app import models
    import app.core.database
    
    # Override the database operations to prevent actual DB connection
    original_create_all = models.Base.metadata.create_all
    original_create_admin = app.core.database.create_default_admin
    
    def mock_create_all(*args, **kwargs):
        print("✅ Mock: Database tables creation (skipped)")
        
    def mock_create_admin(*args, **kwargs):
        print("✅ Mock: Default admin creation (skipped)")
    
    models.Base.metadata.create_all = mock_create_all
    app.core.database.create_default_admin = mock_create_admin
    
    # Import and create the app
    from main import app
    print("✅ FastAPI app created successfully")
    print(f"   App title: {app.title}")
    print(f"   App version: {app.version}")
    
    # Restore original functions
    app.models.Base.metadata.create_all = original_create_all
    app.core.database.create_default_admin = original_create_admin
    
    print("\n🎉 All tests passed! The app should start correctly on Render.")
    
except Exception as e:
    print(f"❌ Error during app initialization: {e}")
    print(f"Error type: {type(e).__name__}")
    traceback.print_exc()
    print("\n❌ The app will fail to start on Render with this configuration.")