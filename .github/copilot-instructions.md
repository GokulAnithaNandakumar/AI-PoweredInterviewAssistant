# AI-Powered Interview Assistant - Project Setup

## Project Requirements ✅
- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI + Python
- **Database**: Neon (Serverless Postgres) + Drizzle ORM
- **State Management**: Redux Toolkit + Redux Persist
- **UI Library**: Ant Design
- **AI**: Gemini + LangGraph for agent orchestration
- **File Processing**: Resume parsing (PDF/DOCX)
- **Real-time**: WebSocket for tab synchronization

## Core Features
1. **Resume Upload & Parsing**: Extract Name, Email, Phone from PDF/DOCX
2. **Missing Field Collection**: Chatbot collects missing info before interview
3. **Timed Interview**: 6 questions (2 Easy/20s, 2 Medium/60s, 2 Hard/120s)
4. **Two Tabs**: Interviewee (chat) + Interviewer (dashboard) with live sync
5. **Persistence**: Local storage with Welcome Back modal for resume
6. **AI Evaluation**: Dynamic question generation and answer scoring

## Development Guidelines
- Use TypeScript throughout the project
- Implement proper error handling
- Ensure responsive design
- Follow React and FastAPI best practices
- Use LangGraph for AI agent orchestration