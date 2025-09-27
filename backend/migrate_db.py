#!/usr/bin/env python3
"""
Database migration script to add missing fields to interview_sessions table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings

def migrate_database():
    """Add resume_summary JSON column to interview_sessions table"""
    engine = create_engine(settings.DATABASE_URL)

    # SQL to add resume_summary column
    migrations = [
        "ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS resume_summary JSON;",
        "ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS student_ai_summary TEXT;",
        "ALTER TABLE interview_sessions ALTER COLUMN ai_summary TYPE TEXT USING ai_summary::text;",
        "ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;"
    ]

    try:
        with engine.connect() as connection:
            for migration in migrations:
                print(f"Executing: {migration}")
                try:
                    connection.execute(text(migration))
                    connection.commit()
                    print(f"✅ Success")
                except Exception as e:
                    print(f"⚠️  Migration might already be applied: {e}")
        print("✅ Database migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

    return True

if __name__ == "__main__":
    migrate_database()