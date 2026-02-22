Product Requirements Document (PRD)
AI Appointment Agent for Auto Repair Shop
Version: 1.0
Date: February 12, 2026
Platform: Next.js + Vercel
Integration: Shopmonkey API v2
1. Executive Summary
Build a mobile-responsive AI chat agent for a car repair shop website that gathers customer intake information (phone, vehicle details, service description), maintains conversation transcripts, and sends complete context to the service advisor via email. No quotes, diagnosis, or appointment scheduling from AI—all decisions remain with the service advisor. Media uploads (images/videos) supported — files are stored for 90 days and signed links in emails are valid for 65 days.
2. Goals
Capture customer intake information 24/7 (phone, vehicle, issue description)
Reduce manual data entry for service advisors
Maintain complete conversation records for advisor review
Integrate seamlessly with existing Shopmonkey workflow
Enable service advisors to focus on diagnosis and quoting (not data collection)
3. User Stories
As a customer, I want to submit my vehicle details and describe my issue via chat so I don't have to call during business hours.
As a service advisor, I want to receive a complete intake email with customer + vehicle + service details so I can review context before calling them back to schedule and discuss pricing.
As a service advisor, I want AI to gather thorough information with smart clarifying questions so I can make informed decisions about diagnostics, timing, and scheduling.
4. Technical Stack

| Component | Technology | Purpose |
|-----------|------------|----------|
| Framework | Next.js 16+ (App Router, Turbopack) | Full-stack application |
| Hosting | Vercel | Serverless deployment |
| AI | OpenRouter (DeepSeek v3.2) primary | Conversation processing |
| AI Fallback | Kimi → Claude → Gemini | Provider failover chain |
| Session Cache | Postgres `session_kv` (TTL 1hr) | Active conversation state |
| Database | Vercel Postgres (Neon) | Permanent data storage |
| File Storage | Vercel Blob | Media uploads (90-day lifecycle, 65-day signed links) |
| Email | Resend | Transcript delivery |
| Scheduling | Vercel Cron | Media cleanup, session cleanup |

**Implementation Notes:**
- All backend code in `src/app/api/` (Next.js App Router)
- Shared libraries in `src/lib/` (ai-provider, session, shopmonkey, email)
- UI components in `src/components/` (AIChatbot, ChatbotButton)
- Native fetch API throughout (no axios or external HTTP clients)
- TypeScript strict mode with full type safety
5. Core Features
5.1 AI Conversation Engine

**CRITICAL CONSTRAINT: AI is an intake specialist, NOT a diagnostic tool or quoting engine.**

**Current Implementation Status:**
✅ Polished UI integrated with real backend APIs
✅ Multi-provider failover (OpenRouter/Kimi/Claude/Gemini)
✅ Session management with 1-hour TTL and 24-hour restore window
✅ Error handling with user-friendly messages
✅ Connection status indicator
✅ TypeScript strict mode throughout

Capabilities:
- Greet customers warmly and set expectations
- Collect phone number → Query Shopmonkey API to check existing customer status
- If existing customer: Load from Shopmonkey (history, prior visits, vehicles)
- If new customer: Collect customer details (name, phone, email, address)
- Query Shopmonkey vehicle database for existing customer
- If vehicles exist: Present options ("Is this your Honda Civic?") or allow new vehicle entry
- If new customer: Collect vehicle information (year, make, model, VIN optional, mileage)
- Ask clarifying questions about service need ("When did you first notice this?" "Does it happen every time?")
- Capture detailed description of customer's concern
- **NEVER provide a quote, diagnosis, or cost estimate**
- **NEVER commit to specific appointment time** — gather availability need, defer to advisor
- **ALWAYS route complex issues to advisor** ("One of our service advisors will review this and call you back shortly")

Conversation Flow:
Greeting → 1. Phone Lookup → 2. Vehicle Verification/Entry → 3. Service Need (Clarifying Questions) → 4. Confirmation & Handoff to Advisor

Conversation Tone:
Friendly, curious, thorough. Like a service advisor taking notes before handing off to the manager.
Example: "Tell me more about that noise—is it when you're accelerating or at idle?" (Gather data, not diagnose)

System Prompt & Sample Dialogues

System Prompt (Kimi primary):
You are a professional auto repair service advisor focused on collecting intake information. Be concise, friendly, and thorough. Your job is to obtain necessary customer details (phone, name, email, vehicle info) and clarify service needs with targeted questions. Never provide diagnoses, price estimates, or commit to appointment times. If a customer asks for a quote or asks to schedule, respond: "A service advisor will review your request and call you back at [phone]. They will confirm availability and pricing." If an external system (Shopmonkey) is unavailable, continue collecting data and add a note for the advisor. When handing off, summarize collected details and tell the customer an advisor will reach out.

Sample Dialogues:
1) New customer — Happy path:
Customer: "Hi, my car won't start."
Agent: "Hi — I'm here to help. What's your phone number?"
Customer: "+1 303-699-0001"
Agent: "Thanks — I don't see that number in our system. What's your name?"
Customer: "John Doe"
Agent: "Great. Do you have the vehicle info? Year/make/model, or would you like help entering it?"
Customer: "2022 Honda Civic"
Agent: "Thanks — when did this start happening, and do you see any warning lights?"
... [hand off and confirm]

2) Returning customer — Vehicle selection:
Customer: "+1 303-699-0001"
Agent: "Welcome back, John — I found 2022 Honda Civic and 2018 Ford F-150. Which vehicle is this about?"
Customer: "Honda Civic"
Agent: "Got it. Tell me more about the issue."

3) Quote-request deferral:
Customer: "How much will this cost?"
Agent: "Good question—an advisor will call you at [phone] to confirm availability and pricing. In the meantime, can you share when you first noticed this?"

4) Media upload:
Customer: "I can send a photo"
Agent: "Please tap the camera and upload an image of the issue. We'll attach it to your intake for the advisor."
[client uploads → agent confirms upload received]

5) Shopmonkey down fallback:
Agent detects lookup failure: "Thanks — I couldn't check your account right now. Can you confirm your name and email so we can create a record?"

6) Provider failover (Kimi timeout):
If AI provider timeout occurs, continue collecting raw text and add note: "Processed by fallback provider."

Data Collected & Included in Shop Advisor Email:
- Customer history (prior visits, preferred technician) from Shopmonkey lookup
- Existing vehicles from Shopmonkey
- NEW vehicle details (if applicable)
- Detailed service need description with all clarifying questions asked
- All customer lookup data
- **Note: AI did NOT commit to appointment time — service advisor owns scheduling decision**
5.2 Shopmonkey Integration
Based on Shopmonkey Developer Documentation and Appointment API:

**Customer Lookup (First Action in Conversation):**
GET /customers?phone={} — Check existing customer by phone NUMBER
- Returns: customer ID, name, email, prior visit history, preferred technician
- New customer? POST /customers with firstName, lastName, emails[], phoneNumbers[]
- Result included in transcript for service advisor context

**Vehicle Intelligence:**
GET /vehicles?customerId={} — List existing customer vehicles
- If vehicles exist: Present options to customer ("Is this your Honda Civic?")
- If selection: Use vehicleId from list
- If new vehicle: POST /vehicles with year, make, model, vin, licensePlate, customerId

**CRITICAL: No Appointment Creation from Chat**

The AI does NOT create appointments in Shopmonkey. Instead:
- Collect all intake information (customer, vehicle, service need)
- Email transcript to service advisor at cndautoservice@gmail.com
- Service advisor reviews and decides:
  - How long appointment should be (based on their expertise)
  - What day/time (based on current shop load)
  - Whether to call customer back with questions
  - How to position the service (diagnostic? repair? both?)
- Service advisor creates appointment in Shopmonkey
- Service advisor owns all communication with customer

**Why this approach:**
- Avoids AI making diagnostic/quoting errors
- Advisor retains control over scheduling and customer experience
- Reduces friction: customer provides info once, advisor acts on it
- Maintains trust: human-verified information in Shopmonkey

**Fallback for Customer Questions During Chat:**
If customer asks "How much will this cost?" or "When can you fit me in?":
- AI response: "Great question! A service advisor will review your request and call you back at [phone] within [timeframe]. They'll confirm availability and pricing."
- Direct phone: 3016990001 (if customer prefers not to wait)

Key Fields Captured:
Customer: firstName, lastName, phone, emails[], address
Vehicle: year, make, model, vin, licensePlate, mileage, customerId
Service Need: detailed description, clarifying details, customer expectations

Error Handling: See Section 9 (Error Handling Matrix)
5.3 Media Upload System
Supported Files:
Images: JPG, PNG, HEIC, WebP
Video: MP4, MOV, WebM, AVI
Limits: 10MB per file, 5 files per conversation, 5 minutes max duration
Upload Process:
Client-side compression
Presigned URL request from backend
Direct upload to Vercel Blob
Metadata stored in Postgres

Retention Policy:
Media files: 90 days (Vercel Blob) — stored longer for operational backup
Media metadata: Permanent (Postgres)
Text transcript: Permanent (Postgres)
Email messaging to customers: State "Media links valid for 65 days" to manage expectations

Benefit: Acts as backup in case Shopmonkey API degradation occurs; system can email conversation + media to shop manager even if Shopmonkey is unavailable
5.4 Email Notification System
Trigger Events:
- Conversation completed (customer finished intake)
- Conversation abandoned (30 min inactivity + no advisor callback scheduled)
- Manual customer request ("Send me a copy")
- Customer escalation to human (phone request or complex issue)

Email Content to Service Advisor (cndautoservice@gmail.com):
✓ Full conversation transcript (text)
✓ Shopmonkey lookup results ("This is a returning customer, 8 prior visits, preferred tech: Marcus")
✓ Customer details (name, phone, email, address from Shopmonkey)
✓ Vehicle details (year, make, model, VIN, license plate, mileage)
✓ Service request (what customer reported, with all clarifying Q&A)
✓ Media links with signed URLs (valid 65 days) — images/videos of the issue
✓ Escalation notes if customer requested callback (phone + message)
✓ **Important note: "AI did not commit to appointment time. You decide availability and schedule."**
✓ Note: "Media files and signed URLs valid for 65 days"

Email Subject: "New Service Request: [Customer Name] - [Vehicle Make/Model] - [Service Type]"

Recipients:
Primary: Service Advisor email (cndautoservice@gmail.com)
Secondary: Customer email (optional, only if customer requests "send me a copy")

Service Advisor Action Items (from email context):
1. Review conversation transcript and customer details
2. Verify vehicle information in Shopmonkey
3. Assess service need (may require callback for clarification)
4. Schedule appointment at appropriate time/duration
5. Call or email customer to confirm
6. Create appointment in Shopmonkey

Rationale: Service advisor receives complete intake context, can schedule appropriately without customer frustration (no double-confirmation needed)
6. Data Architecture
6.1 Session Cache (Postgres / Redis)
Purpose: Active conversation state during chat
TTL: 1 hour from last message activity (refreshed on each message)
Data: Current step, collected data (phone, customer ID, vehicle ID), message history, Shopmonkey lookup results

Session Behavior:
- Customer enters chat → System checks session table for recent session (last 24 hours)
- If active session row (0-1 hour): Resume conversation
- If expired session row but Postgres record exists (1-24 hours): Restore from Postgres, show "Welcome back! Your intake is ready. Anything else you'd like to add?"
- If no session > 24 hours old: Start fresh conversation
6.2 Vercel Postgres (Permanent Storage)
Tables:

conversations {
  id, customer_id, appointment_id,
  transcript_text, -- Full text, permanent
  shopmonkey_lookup_result, -- JSON from customer lookup
  status, -- 'active', 'abandoned', 'completed'
  last_activity_at, -- For 24-hour session restoration
  created_at, updated_at
}

customers {
  id, shopmonkey_customer_id, -- Source of truth from Shopmonkey
  first_name, last_name, email, phone,
  address1, city, state, postal_code,
  preferred_technician, -- From Shopmonkey lookup
  visit_history_count, -- From Shopmonkey lookup
  created_at, updated_at
}

vehicles {
  id, customer_id, shopmonkey_vehicle_id, -- Source of truth from Shopmonkey
  year, make, model, vin, license_plate, mileage,
  created_at, updated_at
}

appointments {
  id, conversation_id, shopmonkey_appointment_id,
  shopmonkey_order_id, -- Auto-created by Shopmonkey
  scheduled_date, scheduled_time, service_type,
  location_id, note,
  status, -- 'pending', 'confirmed', 'completed'
  created_at, updated_at
}

media {
  id, conversation_id,
  blob_path, -- Null after 90-day deletion
  filename, mime_type, size_bytes,
  uploaded_at, deleted_at -- 90 day lifecycle
}

email_log {
  id, conversation_id, recipient, sent_at, status, email_type
}

escalations {
  id, conversation_id, customer_phone, message_to_team,
  escalation_type, -- 'callback_request', 'complex_issue'
  created_at
}
6.3 Vercel Blob (File Storage)
Structure: conversations/{conversationId}/media/{fileId}
Lifecycle: 90 days (files deleted by cron)
Access: Signed URLs only (generated at email send time; signed links in emails are valid for 65 days)
6.4 Vercel Cron (Cleanup Job)
Schedule: Daily at 2:00 AM
Tasks:
Find media older than 90 days
Delete from Vercel Blob
Mark deleted_at in Postgres
Log cleanup statistics
7. Deployment & Launch

7.1 Launch Strategy
- **Full Market Launch** (no phased rollout)
- Website integrated with floating chatbot button (bottom-right, 56px)
- Service advisor notified of changes to intake workflow
- Contact: cndautoservice@gmail.com | 3016990001

7.2 Service Advisor Onboarding
- Brief walkthrough of email notification workflow
- Sample transcript review
- Training: How to act on AI-collected data (review, verify, decide)
- Tip: "Treat AI data like a written intake form—review, verify, act"

7.3 UI/UX Specifications
7.1 Entry Point
Floating action button: 56px diameter
Position: Bottom-right, 16px margin
Icon: Wrench or calendar
Animation: Subtle pulse every 10 seconds
Tooltip (first visit): "Book service in 2 minutes"
7.2 Chat Interface
Mobile (<640px):
Full-screen modal, slide-up from bottom
Header: Logo, "Book Service", close button
Messages: Scrollable, 100vh minus header/input
Input: Fixed bottom, text field + send + camera
Desktop:
Centered modal, max-width 420px, max-height 80vh
Backdrop: Blur + dark overlay
7.3 Message Design
Agent: Left-aligned, light background
User: Right-aligned, brand color
Typing indicator: Three animated dots
Quick replies: Horizontal scroll chips
Media: Thumbnail preview, tap to expand
7.4 Input Types
Text: Standard keyboard
Phone: Numeric keypad
Email: Email keyboard
Date/Time: Native pickers
Selection: Visual cards with icons
Media: Camera button, compression, progress bar
8. Security & Compliance
8.1 Data Protection
API keys: Server-side only (Vercel env vars)
PII: Encrypted at rest (Postgres), TLS in transit
Media: Signed URLs, random paths, no directory listing
Retention: Clear 65-day media policy stated in email
8.2 Privacy
Customer can request data deletion
IP logged for fraud (anonymized after 30 days)
No credit card data stored (Shopmonkey handles payments)
9. Error Handling Matrix

| Scenario | System Response | Advisor Experience | Recovery |
|----------|-----------------|------------------|-----------|
| Shopmonkey API down (customer lookup) | Log error, continue intake without Shopmonkey context | Email includes note: "Customer lookup failed. Verify phone/customer status manually" | Manual lookup in Shopmonkey |
| Kimi API timeout/error | Fallback "Please describe your issue" - collect raw text | Email includes raw customer notes + transcript | Advisor reviews raw input, contacts customer if needed |
| Kimi API unavailable | Switch to secondary AI provider (Claude/Gemini if configured) | User unaware of provider change | Failover chain: Kimi → Claude → Gemini |
| Vercel Blob upload fails | Retry 3x with exponential backoff | Email includes note: "Media upload failed" + conversation text preserved | Conversation text preserved; customer can resend media via email |
| Email send fails (advisor) | Queue in email_log table, retry via cron every 15 min | Advisor doesn't receive intake notification | Cron job retries up to 72 hours; customer can call 3016990001 |
| Conversation abandoned (30 min+ inactivity) | Mark as abandoned, send email to advisor with transcript | Advisor receives notification of incomplete intake | Advisor can call customer using phone number provided |
| Session expires after 24 hours | Fresh conversation if customer returns | (None - fresh intake) | Previous conversation archived in Postgres; advisor can reference if needed |
| Customer requests quote/appointment time in chat | AI redirects: "Our advisor will call you to confirm details and schedule" | Clear note in email: "Customer asked about pricing/availability—address this in callback" | Service advisor owns all communication |

**Error Handling Philosophy:** Intake data is captured even if downstream services fail. Service advisor always has complete context to reach out to customer.
10. Success Metrics

[ ] Customer completes intake in <3 minutes (from greeting to confirmation)
[ ] Returning customer (within 24h) restores session and sees context ("Welcome back!" flow)
[ ] Intake email sent to cndautoservice@gmail.com within 30 seconds of conversation completion
[ ] Service advisor can review full transcript + media in email within 1 minute
[ ] Service advisor able to call customer back with decision/schedule within 24 hours
[ ] Zero data loss: All conversations permanently stored in Postgres, media backed up to Blob for 90 days
[ ] Mobile experience feels native (smooth, fast, accessible)
[ ] All Vercel resources within free tier at 100 conversations/month
[ ] Graceful degradation: If Kimi API fails, conversation continues with raw text capture
[ ] AI never provides pricing quotes or commits to appointment time (all deferred to advisor)
[ ] AI asks clarifying questions like a service advisor would ("When did you first notice this?")
11. Deliverables
Next.js application (App Router)
Database schema and migrations (Prisma)
Vercel configuration (vercel.json)
Environment variable template
Deployment documentation
Shopmonkey API integration guide
12.1 AI Scope: Intake Only (NOT Diagnostic or Quoting)
The AI chatbot is designed to collect customer information, NOT:
- Diagnose vehicle issues
- Provide cost estimates
- Commit to appointment times
- Make recommendations beyond clarifying questions

Why: Avoids liability, maintains advisor authority, reduces AI risk
Result: Service advisor gets pre-filled intake form, owns all decisions

12.2 No Appointment Creation from Chat
AI does NOT call Shopmonkey to create/confirm appointments.
Instead: Email complete transcript to cndautoservice@gmail.com
Service advisor reviews and decides:
- How long appointment should be
- What day/time slot
- Whether additional callback needed
- How to position service to customer
Result: Human-verified, properly scheduled appointments

12.3 Customer Lookup (First Priority)
Per Shopmonkey Customer Resource, customers queried by phone at conversation start.
Response: customer ID, name, email, phone, visit history, preferred technician
Inclusion: All lookup results stored in Postgres + included in advisor email
Benefit: Advisor has customer history immediately (reduces call-back friction)

12.4 Vehicle Intelligent Lookup
Per Shopmonkey Vehicle Resource, if customer exists, system queries their vehicles first.
If vehicles exist: Present options ("Is this your Honda Civic?") for quick selection
If new vehicle: Collect year/make/model/VIN and create via POST /vehicles
Rationale: Reduces data entry friction for returning customers

12.5 AI Provider Abstraction Layer
Implement provider abstraction to enable failover:
- Primary: Kimi API (configured)
- Fallback: Claude API (if configured)
- Fallback: Gemini API (if configured)
Each conversation logs which provider processed it (db field: ai_provider)
On timeout/error: Automatically switch to next provider in chain
Rationale: Zero customer experience impact if Kimi is throttled or down

12.6 Session Management
Session TTL: 1 hour (active conversation)
Postgres lookup window: 24 hours (session restoration)
Behavior: Customer returns within 24h → same context restored, shows "Welcome back!" confirmation
After 24h: Fresh conversation (prevents stale context)

12.7 Media Backup Strategy
Files stored: 90 days in Vercel Blob
Metadata: Permanent in Postgres
Use case: Customer can upload images/videos of vehicle issue
Signature: Signed URLs generated at email send time (valid 65 days)
Customer messaging: "Media links valid for 65 days"

12.8 Human Escalation Paths
- Phone: 3016990001 (direct call to service advisor)
- Email: cndautoservice@gmail.com (backup contact)
- Chat: Message capture, forwarded to advisor
- Pattern tracking: Monitor escalation reasons to improve AI prompts over time
13. Appendix

13.1 Vercel Free Tier Limits (at 100 conversations/month)

| Resource | Limit | Projected Usage | Notes |
|----------|-------|-----------------|-------|
| Session Storage | Postgres (Neon) | - | Session state + recent contexts (use `session_kv` table). Optional: KV Storage (e.g., Upstash) for low-latency cache |
| Postgres Storage | 256MB | 100MB | Transcripts + metadata |
| Blob Storage | 250MB | 200MB (rotating) | Media files, 90-day lifecycle, auto-cleanup |
| Cron Jobs | 2/day | 1/day | Daily 2 AM media cleanup + email retry queue |
| Function Execution | 100GB-hours | ~10GB-hours | Chat processing, Shopmonkey API calls, email delivery |

13.2 Cost Projection

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Vercel (Free Tier) | $0 | Covers all infrastructure |
| Kimi API (~100 conversations) | $2-4 | Primary AI provider |
| Resend (3,000 emails/month) | $0 | Free tier covers advisor + customer emails |
| **Total** | **$2-4/month** | Extremely cost-efficient |

13.3 Conversation Lifecycle Example

**Customer Journey (First-Time):**
1. Customer opens chat
2. AI greets → "What's your phone number?"
3. System queries Shopmonkey: `GET /customers?phone={...}` → NOT FOUND
4. AI: "Let me get a few details. What's your name?"
5. Collect: firstName, lastName, email
6. System: `POST /customers` → receives customerId
7. AI: "Do you have a vehicle already in our system?" → `GET /vehicles?customerId={}` → empty
8. AI: "Tell me about your vehicle" → collects year/make/model/VIN
9. System: `POST /vehicles` → receives vehicleId
10. AI: "What brings you in today?" + Clarifying questions ("When did you first notice this?" "Does it always happen?")
11. Customer describes issue in detail → AI captures full context
12. AI: "Thanks for all those details. A service advisor will review this and call you back shortly at [phone] to confirm availability and discuss next steps."
13. Customer confirms phone number
14. System sends email to cndautoservice@gmail.com with:
    - Full transcript
    - Shopmonkey lookup results
    - Customer details
    - Vehicle info
    - Service description + all clarifying Q&A
    - Media (if any)
15. Service advisor receives email, reviews context, calls customer back
16. Advisor schedules appointment in Shopmonkey
17. Advisor confirms appointment with customer

**Returning Customer (within 24h):**
1. Customer opens chat
2. System checks session table → finds active session
3. AI: "Welcome back! We have your information on file. Help one more time—is there anything else you'd like us to know about that [issue]?"
4. Customer: "Yes, it's also making a squealing noise"
5. AI asks clarifying questions about new symptom
6. System sends updated email to advisor
7. Advisor updates their notes, adjusts appointment recommendation if needed

**Kimi API Failure Scenario:**
1. Customer starts intake
2. Kimi timeout occurs during conversation
3. System: Fallback to Claude or Gemini (transparent to customer)
4. Chat continues normally
5. Email includes note: "Processed by Claude API (Kimi unavailable)"
6. Advisor sees full intake regardless of which AI provider handled it

---

**End of Document**

To save this as a document: Copy the entire text above and paste into Google Docs, Notion, Word, or any text editor. Save as your preferred format (.docx, .pdf, etc.)

**Key Contact:**
Service Advisor: cndautoservice@gmail.com | 3016990001
To save this as a document:
Copy the entire text above
Paste into Google Docs, Notion, Word, or any text editor
Save as your preferred format (.docx, .pdf, etc.)