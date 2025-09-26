from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, get_db
from app.models import Base
from app.api import auth, interview, dashboard
from typing import Dict, List
import json

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="AI-Powered Interview Assistant",
    description="A comprehensive interview management system with AI evaluation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_token: str):
        await websocket.accept()
        if session_token not in self.active_connections:
            self.active_connections[session_token] = []
        self.active_connections[session_token].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_token: str):
        if session_token in self.active_connections:
            self.active_connections[session_token].remove(websocket)
            if not self.active_connections[session_token]:
                del self.active_connections[session_token]
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast_to_session(self, message: str, session_token: str):
        if session_token in self.active_connections:
            for connection in self.active_connections[session_token]:
                await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{session_token}")
async def websocket_endpoint(websocket: WebSocket, session_token: str):
    await manager.connect(websocket, session_token)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Broadcast message to all connections in this session
            await manager.broadcast_to_session(data, session_token)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_token)

@app.get("/")
async def root():
    return {
        "message": "AI-Powered Interview Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "authentication": "/api/auth",
            "interview": "/api/interview",
            "dashboard": "/api/dashboard",
            "websocket": "/ws/{session_token}"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AI Interview Assistant API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)