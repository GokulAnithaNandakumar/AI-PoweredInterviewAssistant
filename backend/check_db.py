#!/usr/bin/env python3
"""
Script to check database schema and test data insertion
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from app.models import InterviewSession
from app.core.database import get_db
import json

def check_database():
    """Check database schema and test operations"""
    engine = create_engine(settings.DATABASE_URL)

    try:
        # Check if table exists and get columns
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Available tables: {tables}")

        if 'interview_sessions' in tables:
            columns = inspector.get_columns('interview_sessions')
            print("\nColumns in interview_sessions:")
            for col in columns:
                print(f"  {col['name']}: {col['type']}")

        # Test a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT COUNT(*) as count FROM interview_sessions"))
            count = result.fetchone()[0]
            print(f"\nTotal interview sessions: {count}")

            # Check a specific session if exists
            if count > 0:
                result = connection.execute(text("""
                    SELECT id, candidate_name, resume_url, resume_summary, ai_summary, total_score
                    FROM interview_sessions
                    ORDER BY id DESC
                    LIMIT 3
                """))
                sessions = result.fetchall()
                print(f"\nLast 3 sessions:")
                for session in sessions:
                    print(f"  ID: {session[0]}, Name: {session[1]}, Resume URL: {session[2]}")
                    print(f"    Resume Summary: {session[3] is not None}, AI Summary: {session[4] is not None}")
                    print(f"    Total Score: {session[5]}")

    except Exception as e:
        print(f"Database check failed: {e}")
        return False

    return True

if __name__ == "__main__":
    check_database()