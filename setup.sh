#!/bin/bash

# AI-Powered Interview Assistant - Setup Guide
# =============================================

echo "🚀 Setting up AI-Powered Interview Assistant..."

# Check if conda environment exists
if conda env list | grep -q "interview-assistant"; then
    echo "✅ Conda environment 'interview-assistant' already exists"
else
    echo "❌ Conda environment not found. Please create it first:"
    echo "   conda create -n interview-assistant python=3.11 -y"
    exit 1
fi

# Activate conda environment
echo "🔧 Activating conda environment..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate interview-assistant

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Create .env file from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please update the .env file with your actual values:"
    echo "   - DATABASE_URL: Your Neon database connection string"
    echo "   - SECRET_KEY: A secure secret key for JWT tokens"
    echo "   - GEMINI_API_KEY: Your Google Gemini API key"
    echo ""
fi

# Run database migrations (if using Alembic)
echo "🗃️  Setting up database..."
# alembic upgrade head  # Uncomment when migrations are ready

cd ../frontend

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "🎉 Setup complete! To start the application:"
echo ""
echo "Backend (Terminal 1):"
echo "  conda activate interview-assistant"
echo "  cd backend"
echo "  python main.py"
echo ""
echo "Frontend (Terminal 2):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "🌐 Application will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"