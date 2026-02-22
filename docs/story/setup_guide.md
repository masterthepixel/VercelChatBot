# CND Auto Service Chatbot — Setup Guide

## Prerequisites

Before running the chatbot, you need to set up the following services and obtain their credentials.

---

## 1. OpenRouter API Key (AI Provider)

**What it does:** Routes your chat messages to DeepSeek for AI responses.

**Steps:**
1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Create an account
3. Go to **Keys** → **Create Key**
4. Copy the API key

**Env variable:**
```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
```

**Cost:** ~$2-4/month at 100 conversations

---

## 2. Neon Postgres Database

**What it does:** Stores conversation transcripts, customer data, and session state permanently.

**Steps:**
1. Go to [https://neon.tech](https://neon.tech)
2. Sign up (free tier: 512MB storage, 0.25 vCPU)
3. Create a new project (name it `cnd-chatbot` or similar)
4. Go to **Dashboard** → **Connection Details**
5. Copy the connection string (pooled recommended)

**Env variable:**
```
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**After first deploy:** Hit `POST /api/init-db` once to create the tables. You can do this with curl:
```bash
curl -X POST http://localhost:3000/api/init-db
```

---

## 3. EmailJS Account

**What it does:** Sends the completed intake transcript to cndautoservice@gmail.com from the client side (no server email config needed).

### 3a. Create Account
1. Go to [https://www.emailjs.com](https://www.emailjs.com)
2. Sign up (free tier: 200 emails/month, 2 templates)

### 3b. Add Email Service
1. Go to **Email Services** → **Add New Service**
2. Choose **Gmail** (or your preferred provider)
3. Connect your Gmail account (the "from" address)
4. Note the **Service ID** (e.g., `service_abc123`)

### 3c. Create Email Template
1. Go to **Email Templates** → **Create New Template**
2. Set the **To Email** field to: `{{to_email}}`
3. Set the **Subject** to: `{{subject}}`
4. Use this template body (copy/paste):

```
New Service Intake Request
==========================

Date: {{date}}
Conversation ID: {{conversation_id}}

CUSTOMER INFORMATION
--------------------
Name: {{customer_name}}
Phone: {{customer_phone}}
Email: {{customer_email}}

VEHICLE INFORMATION
-------------------
{{vehicle_info}}

SERVICE DESCRIPTION
-------------------
{{service_description}}

FULL CONVERSATION TRANSCRIPT
-----------------------------
{{transcript}}

==========================
NOTE: AI did NOT commit to appointment time.
You decide availability and schedule.
```

5. Save the template
6. Note the **Template ID** (e.g., `template_xyz789`)

### 3d. Get Public Key
1. Go to **Account** → **General**
2. Copy your **Public Key** (e.g., `user_ABCdef123`)

### 3e. Env Variables
```
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_ABCdef123
```

---

## 4. Environment File Setup

Create a file called `.env.local` in the project root (`/GitHub/VercelChatBot/.env.local`):

```env
# AI Provider (OpenRouter with DeepSeek)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx

# Neon Postgres Database
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# EmailJS (client-side)
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_abc123
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xyz789
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=user_ABCdef123
```

**IMPORTANT:** Never commit `.env.local` to git. It is already in `.gitignore` by default.

---

## 5. Run the App

```bash
cd /home/mastethepixel/GitHub/VercelChatBot
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) and click the wrench icon.

---

## 6. Initialize the Database

After the app is running, create the database tables by running:

```bash
curl -X POST http://localhost:3000/api/init-db
```

You only need to do this once.

---

## 7. Test the Full Flow

1. Open the chatbot (click wrench icon)
2. Walk through the intake conversation (phone, name, email, vehicle, service need)
3. AI will ask clarifying questions and summarize
4. On completion, the transcript is:
   - Saved to Neon Postgres
   - Emailed to cndautoservice@gmail.com via EmailJS
5. Check your email for the intake notification

---

## 8. Deploy to Vercel (When Ready)

1. Push the repo to GitHub
2. Go to [https://vercel.com](https://vercel.com) → **New Project** → Import the repo
3. Add all environment variables from `.env.local` to Vercel's **Settings → Environment Variables**
4. Deploy
5. Hit `POST https://your-domain.vercel.app/api/init-db` once to create tables in production

---

## Service Accounts Summary

| Service | URL | Free Tier | What You Need |
|---------|-----|-----------|---------------|
| OpenRouter | openrouter.ai | Pay-as-you-go ($2-4/mo) | API Key |
| Neon Postgres | neon.tech | 512MB storage | Connection string |
| EmailJS | emailjs.com | 200 emails/month | Service ID, Template ID, Public Key |
| Vercel | vercel.com | Hobby (free) | GitHub connection |

---

## Contact

Service Advisor Email: cndautoservice@gmail.com
Service Advisor Phone: 301-699-0001
