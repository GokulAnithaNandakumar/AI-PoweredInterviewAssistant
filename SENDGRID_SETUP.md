# SendGrid Setup Guide for Email Delivery on Render

## Problem
Render blocks outbound SMTP connections (ports 25, 587, 465), causing email timeouts. The solution is to use SendGrid's HTTP API instead of SMTP.

## Solution: SendGrid HTTP API

### 1. Create SendGrid Account
1. Go to https://sendgrid.com/
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### 2. Get SendGrid API Key
1. Log into SendGrid dashboard
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Choose "Restricted Access" or "Full Access"
5. For restricted access, enable: "Mail Send" permissions
6. Copy the generated API key (starts with `SG.`)

### 3. Verify Sender Email
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill out the form with your email details
4. Click "Create" and verify your email
5. This email will be used as the "From" address

### 4. Update Environment Variables

Add to your `.env` file:
```bash
# SendGrid Configuration (Primary for production)
SENDGRID_API_KEY=SG.your_actual_api_key_here

# Keep existing SMTP config for local fallback
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_gmail@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_FROM_NAME=AI Interview Assistant
```

### 5. Update Render Environment Variables
In your Render dashboard:
1. Go to your service → Environment
2. Add: `SENDGRID_API_KEY` = `SG.your_actual_api_key_here`
3. Keep existing email variables for SMTP fallback

## How It Works

The new email service uses a **dual-delivery approach**:

1. **Primary**: SendGrid HTTP API (works on Render)
2. **Fallback**: SMTP (for local development)

```python
# Email delivery priority:
1. Try SendGrid API (HTTP) ✅ Works on Render
2. If SendGrid fails → Try SMTP ✅ Works locally
3. Log detailed errors for debugging
```

## Benefits

✅ **Reliable on Render**: HTTP API bypasses SMTP port blocks  
✅ **Local Development**: Falls back to Gmail SMTP  
✅ **Better Deliverability**: SendGrid has excellent reputation  
✅ **Free Tier**: 100 emails/day free  
✅ **Professional**: Sender authentication, analytics  

## Testing

### Local Test (SMTP fallback):
```bash
cd backend
python -c "
import asyncio
from app.services.email_service import EmailService
async def test():
    result = await EmailService.send_interview_link(
        'test@example.com', 
        'Test User', 
        'https://example.com/interview/123'
    )
    print(f'Success: {result}')
asyncio.run(test())
"
```

### Production Test (SendGrid):
Deploy to Render with `SENDGRID_API_KEY` set and test the email flow.

## Troubleshooting

### SendGrid Issues:
- Check API key is correct and starts with `SG.`
- Verify sender email in SendGrid dashboard
- Check SendGrid activity logs for delivery status

### SMTP Fallback Issues:
- Ensure Gmail 2FA is enabled
- Use App Password, not regular password
- Check Gmail "Less secure app access" settings

### Import Issues:
If you get import errors, ensure dependencies are installed:
```bash
pip install sendgrid aiosmtplib email-validator
```

## Current Implementation Status

✅ SendGrid HTTP API integration complete  
✅ SMTP fallback for local development  
✅ Dual-delivery system implemented  
✅ Dependencies added to requirements.txt  
⏳ Waiting for SendGrid API key configuration  

Once you add the SendGrid API key, emails will be delivered reliably on Render!