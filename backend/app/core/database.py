from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    from app.models import Base
    Base.metadata.create_all(bind=engine)

def create_default_admin():
    from app.models import Interviewer
    from app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(Interviewer).filter(Interviewer.email == "admin@admin.com").first()
        if not admin:
            admin = Interviewer(
                email="admin@admin.com",
                username="admin",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin"),
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✅ Default admin user created: username=admin, password=admin")
        else:
            print("✅ Admin user already exists")
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()