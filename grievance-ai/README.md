# CivicLink — AI-Powered Grievance Lodging & Tracking System

Citizens report civic issues in plain language. A **local AI (Ollama)** categorises each complaint, detects its priority, writes an admin summary, merges duplicate reports and routes it to the right department — automatically. Departments work a live queue; citizens watch progress in real time.

## Problem it solves
Manual categorisation · wrong department assignment · slow response · no intelligent assistance · poor tracking · duplicate complaints.

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | React 18 (Vite), React Router, Axios, Tailwind CSS, React Icons, Recharts, socket.io-client |
| Backend | Node.js, Express, REST APIs, Socket.io (live status), Multer (photo/PDF uploads) |
| Database | MySQL + **Prisma ORM** |
| Auth | Google OAuth (`@react-oauth/google` + `google-auth-library`) · JWT · bcrypt (email/password fallback) |
| AI | **Ollama** (Llama 3 / Mistral / Gemma / Phi — runs locally, no internet needed) |

## Architecture
```
User → Google OAuth → React → Express REST API → MySQL (Prisma)
                                    │
                                    ▼
                          Ollama AI pipeline
        category · department · priority · summary · duplicate check
                                    │
                                    ▼
            Auto-assign department → Socket.io live updates
                                    │
            Department dashboard: Accept → In Progress → Resolved
```

## Prerequisites
- Node.js 18+
- MySQL 8+
- [Ollama](https://ollama.com) with a model pulled: `ollama pull llama3`
- A Google OAuth Client ID (Web) from https://console.cloud.google.com
  - Authorized JavaScript origin: `http://localhost:5173`

## 1. Database
```bash
mysql -u root -p -e "CREATE DATABASE grievance_ai"
```

## 2. Backend
```bash
cd backend
cp .env.example .env        # fill DATABASE_URL, GOOGLE_CLIENT_ID, JWT_SECRET
npm install
npx prisma migrate dev --name init   # creates all tables
npm run seed                          # seeds 8 departments
npm run dev                           # http://localhost:5000
```

## 3. Frontend
```bash
cd frontend
cp .env.example .env        # set VITE_GOOGLE_CLIENT_ID (same client id)
npm install
npm run dev                 # http://localhost:5173
```

## 4. Ollama
```bash
ollama serve                # if not already running
ollama pull llama3          # or mistral / gemma / phi — set OLLAMA_MODEL in backend/.env
```
> If Ollama is offline, the backend falls back to a keyword heuristic so the demo never breaks.

## 5. Create the admin & department users
Sign in once with Google, then in MySQL:
```sql
UPDATE User SET role='admin' WHERE email='you@gmail.com';
-- department officer (departmentId from the Department table):
UPDATE User SET role='department', departmentId=3 WHERE email='officer@gmail.com';
```
After that, the admin can change anyone's role from the **Admin → Users & roles** panel in the UI.

## Complaint lifecycle
`Submitted → AI Processing → Assigned → Accepted → In Progress → Resolved → Closed` (or `Rejected`).
Every change is written to `StatusHistory` and pushed to the citizen over Socket.io. Resolving a master complaint auto-resolves its merged duplicates.

## Project structure
```
grievance-ai/
├── backend/
│   ├── server.js            # Express + Socket.io bootstrap
│   ├── socket.js            # JWT-authenticated rooms (user:{id}, dept:{id})
│   ├── prisma/              # schema.prisma + seed.js
│   ├── config/              # Prisma client
│   ├── middleware/          # JWT auth guards, Multer upload
│   ├── controllers/         # auth, complaints, chat, departments, admin
│   ├── routes/              # REST endpoints
│   ├── services/aiService.js# Ollama pipeline + heuristic fallback
│   └── uploads/             # complaint attachments
├── frontend/
│   └── src/
│       ├── pages/           # Login, Dashboard, NewComplaint, History,
│       │                    # Details, Profile, Chatbot, Admin, Department
│       ├── components/      # Navbar, StatusBadge, StatusTimeline, Protected
│       ├── hooks/useAuth.jsx
│       └── services/        # axios instance, socket client
├── database/schema.sql      # raw SQL alternative to Prisma migrate
└── docs/API.md              # REST API reference
```

## Demo script (for judges)
1. Sign in with Google as a citizen → submit *"Gas leakage in residential building, Sector 12"*.
2. Watch the AI card flip from *Analysing…* to **Gas Safety · Critical**, auto-assigned to Gas & Fire Safety.
3. Submit the same pothole complaint from two accounts → the second gets **merged as a duplicate**.
4. Sign in as the department officer → Accept → Start work → Resolve; the citizen's screen updates live.
5. Open the Admin dashboard → Recharts analytics: trend, status donut, per-department load, priority mix.
