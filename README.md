# 🎯 AI-Powered Interview Assistant

## 🌟 **Enhanced Architecture with Authentication**

A sophisticated interview management system featuring **interviewer authentication**, **link-based candidate access**, and **real-time synchronization** between interviewer dashboard and candidate sessions.

### 🏗️ **System Architecture**

```mermaid
graph TB
    subgraph "Frontend (React + Vite + TypeScript)"
        A[Interviewer Login] --> B[Dashboard]
        B --> C[Generate Candidate Links]
        D[Candidate Access] --> E[Interview Session]
        E --> F[Real-time Chat]
    end

    subgraph "Backend (FastAPI + Python)"
        G[Authentication API]
        H[Interview Management]
        I[Dashboard API]
        J[WebSocket Server]
    end

    subgraph "AI Layer (Gemini + LangGraph)"
        K[Question Generator]
        L[Answer Evaluator]
        M[Resume Parser]
        N[Summary Generator]
    end

    subgraph "Database (Neon PostgreSQL)"
        O[(Interviewers)]
        P[(Sessions)]
        Q[(Questions)]
        R[(Answers)]
    end

    A --> G
    C --> H
    E --> I
    F --> J
    H --> K
    H --> L
    H --> M
    H --> N
    G --> O
    H --> P
    K --> Q
    L --> R
```

## 🚀 **Key Features**

### 🔐 **Authentication System**
- **Interviewer Registration & Login**: Secure JWT-based authentication
- **Link Generation**: Interviewers create unique session links for candidates
- **Role-based Access**: Clear separation between interviewer and candidate interfaces

### 👨‍💼 **Interviewer Dashboard**
- **Session Management**: Create and monitor interview sessions
- **Real-time Monitoring**: Watch candidate progress live
- **Candidate Analytics**: View scores, answers, and AI feedback
- **Search & Filter**: Find specific candidates quickly

### 🎓 **Candidate Experience**
- **Resume Upload**: PDF/DOCX parsing with AI extraction
- **Missing Info Collection**: Chatbot prompts for incomplete details
- **Timed Interview**: 6 questions (2 Easy/20s, 2 Medium/60s, 2 Hard/120s)
- **Real-time Feedback**: Immediate AI evaluation

### 🤖 **AI Integration (LangGraph Orchestration)**
- **Question Generator Agent**: Dynamic, difficulty-based question creation
- **Answer Evaluator Agent**: Intelligent scoring and feedback
- **Resume Parser Agent**: Extract name, email, phone from documents
- **Summary Generator Agent**: Comprehensive interview reports

### 📊 **Real-time Synchronization**
- **WebSocket Communication**: Live updates between tabs
- **State Persistence**: Redux + Local Storage for offline capability
- **Welcome Back Modal**: Resume interrupted sessions

## 📋 **Core Requirements Fulfillment**

| ✅ Requirement | Implementation |
|---------------|----------------|
| **Two Tabs** | Interviewer Dashboard + Candidate Chat Interface |
| **Resume Upload** | PDF/DOCX parsing with AI field extraction |
| **Missing Fields** | Chatbot collects incomplete candidate info |
| **Timed Interview** | 6 questions with progressive difficulty & timing |
| **AI Evaluation** | Real-time scoring and feedback generation |
| **Persistence** | Redux-persist + Local Storage |
| **Welcome Back** | Session restoration modal |

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** + **Vite** + **TypeScript**
- **Redux Toolkit** + **Redux Persist**
- **Ant Design** (UI Components)
- **Socket.io** (Real-time communication)

### **Backend**
- **FastAPI** (Python web framework)
- **SQLAlchemy** + **Alembic** (Database ORM & migrations)
- **JWT Authentication** (python-jose)
- **WebSocket Support** (built-in FastAPI)

### **Database**
- **Neon** (Serverless PostgreSQL)
- **Drizzle ORM** alternative setup included

### **AI & Processing**
- **Google Gemini** (Language Model)
- **LangGraph** (Agent orchestration)
- **PyPDF2** + **python-docx** (Document parsing)

## 📚 **Database Schema**

```sql
-- Interviewers table
CREATE TABLE interviewers (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR UNIQUE NOT NULL,
    interviewer_id INTEGER REFERENCES interviewers(id),
    candidate_name VARCHAR,
    candidate_email VARCHAR,
    candidate_phone VARCHAR,
    status VARCHAR DEFAULT 'created',
    current_question_index INTEGER DEFAULT 0,
    total_score FLOAT DEFAULT 0.0,
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Questions and answers tables included...
```

## 🏃‍♂️ **Quick Start**

### **1. Environment Setup**

```bash
# Create conda environment
conda create -n interview-assistant python=3.11 -y
conda activate interview-assistant

# Clone and setup
git clone <your-repo-url>
cd AI-PoweredInterviewAssistant
chmod +x setup.sh
./setup.sh
```

### **2. Configuration**

Create `.env` files:

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/interview_db
SECRET_KEY=your-super-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=https://ai-poweredinterviewassistant.onrender.com/api
```

### **3. Database Setup (Neon)**

1. Create a [Neon](https://neon.tech) account
2. Create a new project
3. Copy the connection string to `DATABASE_URL`
4. Tables will be created automatically on first run

### **4. Get Gemini API Key**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

### **5. Start the Application**

```bash
# Terminal 1 - Backend
conda activate interview-assistant
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 🎮 **Usage Flow**

### **For Interviewers:**

1. **Register/Login** at `/login`
2. **Generate Links** in dashboard
3. **Send Link** to candidate
4. **Monitor Live** in dashboard
5. **Review Results** after completion

### **For Candidates:**

1. **Access Link** from interviewer
2. **Upload Resume** (PDF/DOCX)
3. **Complete Profile** if info missing
4. **Take Interview** (6 timed questions)
5. **View Results** and AI feedback

## 🔌 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - Register interviewer
- `POST /api/auth/login` - Login interviewer
- `POST /api/auth/create-session` - Generate candidate link

### **Interview**
- `GET /api/interview/{token}/info` - Get session info
- `POST /api/interview/{token}/upload-resume` - Upload resume
- `PUT /api/interview/{token}/candidate-info` - Update candidate info
- `POST /api/interview/{token}/start-interview` - Begin interview
- `POST /api/interview/{token}/submit-answer` - Submit answer

### **Dashboard**
- `GET /api/dashboard/sessions` - Get all candidates
- `GET /api/dashboard/session/{id}` - Get candidate details
- `GET /api/dashboard/stats` - Get dashboard statistics

### **WebSocket**
- `WS /ws/{session_token}` - Real-time communication

## 🤖 **AI Agent Architecture**

### **LangGraph Orchestration**

```python
# Question Generator Agent
question_agent = QuestionGeneratorAgent()
question_data = question_agent.generate_question(
    difficulty="easy|medium|hard",
    question_number=1-6,
    context={
        'candidate_name': 'John Doe',
        'previous_questions': [...]
    }
)

# Answer Evaluator Agent
evaluator_agent = AnswerEvaluatorAgent()
evaluation = evaluator_agent.evaluate_answer(
    question=question_data,
    answer="candidate's response",
    time_taken=45
)

# Resume Parser Agent
resume_agent = ResumeParserAgent()
extracted_info = resume_agent.extract_info(resume_text)

# Summary Generator Agent
summary_agent = SummaryGeneratorAgent()
final_summary = summary_agent.generate_summary(session_data)
```

## 🔄 **Real-time Synchronization**

### **WebSocket Implementation**

```typescript
// Frontend WebSocket connection
const socket = io(`ws://localhost:8000/ws/${sessionToken}`);

socket.on('question_generated', (data) => {
    dispatch(setCurrentQuestion(data.question));
});

socket.on('answer_submitted', (data) => {
    dispatch(updateProgress(data));
});

socket.on('interview_completed', (data) => {
    dispatch(completeInterview(data));
});
```

## 📱 **Responsive UI Components**

### **Ant Design Integration**

```typescript
// Interview Timer Component
<Progress
    type="circle"
    percent={(timeRemaining / timeLimit) * 100}
    format={() => `${timeRemaining}s`}
    status={timeRemaining < 10 ? 'exception' : 'active'}
/>

// Candidate Dashboard
<Table
    dataSource={candidates}
    columns={candidateColumns}
    pagination={{ pageSize: 10 }}
    loading={isLoading}
/>

// Chat Interface
<Card className="interview-chat">
    <ChatMessages messages={chatHistory} />
    <Input.TextArea
        value={currentAnswer}
        placeholder="Type your answer here..."
        disabled={!isTimerRunning}
    />
</Card>
```

## 📊 **State Management**

### **Redux Architecture**

```typescript
// Store Structure
interface RootState {
    auth: {
        interviewer: Interviewer | null;
        token: string | null;
        isAuthenticated: boolean;
    };
    interview: {
        currentSession: InterviewSession | null;
        currentQuestion: InterviewQuestion | null;
        chatHistory: ChatMessage[];
        timeRemaining: number;
        isTimerRunning: boolean;
    };
    dashboard: {
        candidates: CandidateListItem[];
        selectedCandidate: CandidateDetails | null;
        stats: DashboardStats;
    };
}
```

## 🚀 **Deployment Options**

### **Frontend (Vercel/Netlify)**
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### **Backend (Railway/Heroku)**
```bash
# Docker deployment
docker build -t interview-assistant-backend .
docker run -p 8000:8000 interview-assistant-backend

# Railway deployment
railway up
```

## 🔒 **Security Features**

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt
- **CORS Configuration** for cross-origin requests
- **Input Validation** with Pydantic schemas
- **SQL Injection Protection** via SQLAlchemy ORM

## 📈 **Performance Optimizations**

- **Code Splitting** with React lazy loading
- **API Response Caching** with React Query
- **WebSocket Connection Pooling**
- **Database Indexing** on frequently queried fields
- **CDN Integration** for static assets

## 🧪 **Testing Strategy**

```bash
# Frontend testing
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests

# Backend testing
pytest tests/             # API tests
pytest --cov=app tests/   # Coverage report
```

## 📝 **Development Guidelines**

### **Code Structure**
```
backend/
├── app/
│   ├── api/              # API routes
│   ├── core/             # Configuration & security
│   ├── models/           # Database models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── ai_agents/        # AI agent implementations
├── tests/                # Test files
└── main.py               # Application entry point

frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route components
│   ├── store/           # Redux store & slices
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript definitions
└── public/              # Static assets
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Swipe** for the comprehensive assignment requirements
- **Google Gemini** for powerful AI capabilities
- **Neon** for serverless PostgreSQL hosting
- **Ant Design** for beautiful UI components

---

## 🔗 **Live Demo Links**

- **Frontend**: [https://your-app.vercel.app](https://your-app.vercel.app)
- **Backend API**: [https://your-api.railway.app](https://your-api.railway.app)
- **API Documentation**: [https://your-api.railway.app/docs](https://your-api.railway.app/docs)

## 📞 **Support**

For questions or support, please create an issue in the repository or contact [your-email@example.com](mailto:your-email@example.com).

---

**Happy Interviewing! 🎯**