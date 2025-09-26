# Deployment Fixes for Render & Vercel

## Issues Fixed

### 1. CORS_ORIGINS Parsing Error ✅
**Problem**: `pydantic_settings.sources.SettingsError: error parsing value for field "CORS_ORIGINS" from source "EnvSettingsSource"`
- **Root Cause**: Environment variable was set as JSON array string `["url1", "url2"]` which caused JSON parsing errors
- **Solution**: Updated config to accept comma-separated strings like `url1,url2`

**Files Modified**:
- `backend/app/core/config.py`: Added flexible parsing for CORS_ORIGINS and WEBSOCKET_ORIGINS
- `backend/.env.example`: Changed format from JSON array to comma-separated values
- `backend/main.py`: Updated to use dynamic CORS origins from config

### 2. Port Binding Issue ✅
**Problem**: `Port scan timeout reached, no open ports detected`
- **Root Cause**: App wasn't reading the PORT environment variable that Render sets
- **Solution**: Updated app to use `os.environ.get("PORT", 8000)` for dynamic port assignment

**Files Modified**:
- `backend/main.py`: Added dynamic port reading from environment
- `backend/app/core/config.py`: Added PORT configuration option
- `backend/.env.example`: Documented PORT variable

### 3. Email Service Timeout ✅
**Problem**: `Timed out connecting to smtp.gmail.com on port 587`
- **Root Cause**: Render's network restrictions and Gmail SMTP timeout
- **Solution**: Added retry logic with SSL fallback and graceful failure handling

**Files Modified**:
- `backend/app/services/email_service.py`: Added timeout, retry logic, and SSL fallback
- `backend/app/api/auth_v2.py`: Enhanced error handling and response messages

### 4. Frontend SPA Routing 404s on Vercel ✅
**Problem**: Direct URL access like `/interview/token` or `/auth` returns 404 on Vercel
- **Root Cause**: Vercel doesn't know how to handle client-side routing for SPAs
- **Solution**: Added `vercel.json` configuration to rewrite all routes to `index.html`

**Files Modified**:
- `frontend/vercel.json`: Added SPA routing configuration
- `frontend/vite.config.ts`: Enhanced build configuration
- `frontend/index.html`: Updated title and metadata

## Environment Variables for Render

Make sure to set these in your Render dashboard:

```bash
# Server
PORT=8000

# Database (your Neon database URL)
DATABASE_URL=postgresql://neondb_owner:npg_DsELxTdJP8q2@ep-aged-violet-aduwdzir-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# JWT
SECRET_KEY=3e952646755d18e027b0b1e3065ed16ad9c0e0412aa645e91d8655e04c4f4aa6
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gemini API
GEMINI_API_KEY=AIzaSyCE0CuBsQr7aIi4ZgYn-H-W415NG9paVtI

# CORS - Use comma-separated format (NO brackets or quotes)
CORS_ORIGINS=https://ai-powered-interview-assistant-chi.vercel.app,http://localhost:3000

# WebSocket - Use comma-separated format (NO brackets or quotes)
WEBSOCKET_ORIGINS=https://ai-powered-interview-assistant-chi.vercel.app,http://localhost:3000

# Email Configuration (Gmail SMTP)
MAIL_USERNAME=gokul.ietvit@gmail.com
MAIL_PASSWORD=hoac wfgv zmwa fcjh
MAIL_FROM=gokul.ietvit@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_FROM_NAME=AI Interview Assistant
```

## Vercel Configuration

The frontend is now properly configured for Vercel deployment:

1. **`vercel.json`**: Added to handle client-side routing
2. **`vite.config.ts`**: Optimized build configuration
3. **Build settings**: Use the default Vite build commands

## Email Service Improvements

The email service now includes:

- **Timeout handling**: 30-second timeout for SMTP connections
- **Retry logic**: Attempts STARTTLS first, then falls back to SSL (port 465)
- **Graceful failure**: Returns interview link in logs if email fails
- **Enhanced responses**: API now indicates whether email was sent successfully

## Frontend Routing Fix

Added `frontend/vercel.json` with SPA configuration:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This ensures that:
- Direct URL access like `/auth` works correctly
- Interview links like `/interview/session_token` load properly
- All client-side routes are handled by React Router

## Critical Points for Render

1. **CORS_ORIGINS Format**: Use comma-separated values WITHOUT brackets or quotes
   - ✅ Correct: `https://example.com,http://localhost:3000`
   - ❌ Wrong: `["https://example.com", "http://localhost:3000"]`

2. **PORT Variable**: Render automatically sets this, but we also support manual override

3. **Build Command**: Should be `pip install -r requirements.txt`

4. **Start Command**: Should be `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Test Results

✅ Configuration parsing works correctly
✅ FastAPI app starts without errors
✅ CORS origins are properly parsed from environment variables
✅ Port binding is dynamic and supports Render's PORT variable

## Next Steps

1. Update your Render environment variables with the correct CORS_ORIGINS format
2. Redeploy the service
3. The service should now start successfully and bind to the correct port

## Health Check Endpoints

Once deployed, these endpoints should be accessible:
- `GET /` - Root endpoint with API info
- `GET /health` - Health check endpoint
- `GET /api/...` - Your API endpoints