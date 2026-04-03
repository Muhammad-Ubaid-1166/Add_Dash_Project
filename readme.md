**IMPORTANT MESSAGE MUST READ IT PLEASE** ===>>(When you run backed and fronted both and do login then session will be save in localstorage, and if you stop backend and run it again then make sure clear local storage of browser and then login again)<<=====

Here is the completely updated `readme.md` tailored perfectly to your new **microservices architecture**. It clearly separates the Backend, the new AI Microservice, and the Frontend.

Replace your current `readme.md` with this:

```markdown
# AdDash Ecosystem — AI-Powered Ad Campaign Platform

AdDash is a scalable, microservices-based advertising campaign management platform. It consists of a main backend for user/campaign management, a dedicated AI microservice for LLM-powered content generation, and a modern React frontend.

## 🏗 Architecture Overview

The project is structured as a monorepo containing three distinct services:
1. **`backend/`**: The core FastAPI application (Auth, PostgreSQL, Redis, WebSockets, Celery).
2. **`AI Content Generation Microservice/`**: A standalone FastAPI/LangGraph service for generating ad copy, social captions, and hashtags via LLMs.
3. **`Frontend/campaign_frontend/`**: A React (Vite) SPA consuming both APIs.

---

## 🛠 Tech Stack

### Core Backend
- **Framework:** FastAPI (Python 3.12+)
- **Database:** PostgreSQL (asyncpg + SQLModel)
- **Cache/Broker:** Redis
- **Tasks:** Celery (Async emails)
- **Real-time:** WebSockets
- **Migrations:** Alembic

### AI Content Microservice
- **Framework:** FastAPI
- **AI Orchestration:** LangGraph / LangChain (`graphs/` directory)
- **Streaming:** Server-Sent Events (SSE)
- **Infrastructure:** Docker-ready, unique Request ID logging

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Charts:** Recharts
- **Icons:** Lucide React

---

## 📋 Prerequisites

- **Python 3.12+**
- **Node.js & Bun** (or npm)
- **PostgreSQL** (Running locally on port `5432`)
- **Redis** (Running locally on port `6379`)
- **LLM API Key** (e.g., OpenAI, Anthropic) for the AI Microservice

---

## 🚀 Getting Started

### 1. Database Setup
Create the database required by the core backend:
```sql
CREATE DATABASE addash_data;
```

### 2. Core Backend Setup
Open a terminal in the `backend/` directory:

```bash
cd backend

# Setup environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Configure `backend/.env`:**
```env
DATABASE_URL=postgresql+asyncpg://ubaidkamran11:your_secret_password@localhost:5432/addash_data
JWT_SECRET=92edd43d37deae314bcd2c4703b79b81
JWT_ALGORITHM=HS256
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/0
DOMAIN=localhost:8000
POSTGRES_USER=ubaidkamran11
POSTGRES_PASSWORD=your_secret_password
POSTGRES_DB=addash_data
```

**Run Migrations & Start Services:**
```bash
# Apply DB schema
alembic upgrade head

# Start Redis (in a separate terminal)
redis-server

# Start Celery (in a separate terminal)
celery -A src.celery_tasks worker --loglevel=info

# Start Backend Server
uvicorn src.main:app --reload --port 8000
```

---

### 3. AI Content Generation Microservice Setup
Open a **new** terminal in the `AI Content Generation Microservice/` directory:

**Option A: Run via Docker (Recommended)**
```bash
cd "AI Content Generation Microservice"

# Build and run the container
docker-compose up --build
```
*(Note: Ensure you pass your LLM API key in the `docker-compose.yml` environment section or a local `.env` file).*

**Option B: Run Locally**
```bash
cd "AI Content Generation Microservice"

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Configure `AI Content Generation Microservice/.env`:**
```env
# Example for OpenAI (Adjust based on your LLM provider in config.py)
OPENAI_API_KEY=sk-your_api_key_here
```

**Start AI Server:**
```bash
uvicorn app.main:app --reload --port 8001
```

---

### 4. Frontend Setup
Open a **new** terminal in the `Frontend/` directory:

```bash
cd Frontend/campaign_frontend

# Install dependencies
npm install
# OR: bun install

# Start dev server
npm run dev
```
Access the app at `http://localhost:5173`.

---

## 🌐 API Documentation

### Core Backend (`http://localhost:8000`)
- **Docs:** `http://localhost:8000/docs`
- `POST /api/v1/auth/signup` - Create account (Auto-verified)
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/campaign/` - Create campaign
- `POST /api/v1/campaign/{id}/generate-brief` - Generate AI brief
- `WS /ws/notifications/{user_uid}` - Real-time alerts

### AI Microservice (`http://localhost:8001`)
- **Docs:** `http://localhost:8001/docs`
- `GET /health` - Returns service status and loaded model info
- `POST /generate/copy` - Generates headline, body, and CTA. **Supports SSE streaming.**
  - *Body:* `{product, tone, platform, word_limit}`
- `POST /generate/social` - Generates 5 social media caption options.
  - *Body:* `{platform, campaign_goal, brand_voice}`
- `POST /generate/hashtags` - Generates 10 relevant hashtags.
  - *Body:* `{content, industry}`

---

## ✨ Key Features

- **Microservices Architecture:** Clean separation between database/state management and heavy AI processing.
- **Streaming AI Responses:** `/generate/copy` utilizes Server-Sent Events (SSE) for real-time token streaming to the frontend.
- **Observable AI Service:** Built-in unique Request ID logging for easy debugging and tracing of LLM calls.
- **LangGraph Workflows:** AI logic is structured using graph-based orchestration (`app/graphs/`).
- **Real-time Alerts:** WebSocket integration monitors campaign budget and CTR drops.
- **Modern UI:** Responsive layout, multi-step forms, data visualization, and seamless Dark Mode toggle.

---

## 📁 Project Structure

```
.
├── AI Content Generation Microservice/ # Standalone AI LLM Service
│   ├── app/
│   │   ├── config.py                   # LLM & Env configurations
│   │   ├── graphs/                     # LangGraph workflow definitions
│   │   ├── routes/                     # /generate/* endpoints
│   │   ├── schemas.py                  # Pydantic models for AI req/res
│   │   └── main.py                     # FastAPI app setup
│   ├── docker-compose.yml              # Container orchestration
│   ├── Dockerfile                      # Docker build instructions
│   └── requirements.txt
│
├── backend/                            # Core Application Server
│   ├── src/
│   │   ├── auth/                       # JWT Auth, Login, Signup
│   │   ├── Campaign/                   # Campaign CRUD, AI Brief logic
│   │   ├── db/                         # Postgres, SQLModel, Redis
│   │   ├── ws/                         # WebSocket server
│   │   ├── celery_tasks.py             # Async background tasks
│   │   └── config.py
│   ├── migrations/                     # Alembic DB versions
│   └── requirements.txt
│
├── Frontend/
│   └── campaign_frontend/              # React Vite SPA
│       └── src/
│           ├── components/             # Dashboard, Sidebar, Modals
│           ├── context/                # Theme (Dark mode)
│           ├── hooks/                  # Custom hooks (WebSocket, SSE)
│           ├── store/                  # Zustand state management
│           └── services/               # Axios API instances
│
└── readme.md
```
```
