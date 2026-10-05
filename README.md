# Antigravity AI — Academic Research & Personal Assistant Platform
**Release Candidate (`v1.0.0-rc1`)**

A modular, security-hardened AI platform combining deep scholarly research synthesis, source-backed conversational AI, continuous preprint monitoring, desktop companion automation, and privacy controls.

---

## 1. Product Overview
Antigravity AI is an academic research partner designed for researchers, engineers, and scholars. It decomposes scientific questions into structured research angles, queries live academic repositories (arXiv, OpenAlex, Crossref, Semantic Scholar), verifies citations against official DOI registries, and synthesizes evidence with clear provenance badges.

---

## 2. Architecture
The system consists of three decoupled components:
- **Frontend Gateway**: Next.js 16 (React 19, TypeScript, Vanilla CSS design tokens) providing the Command Center, Deep Research Studio, Research Library, Alert Center, and Settings.
- **Backend Core**: FastAPI (Python 3.13) exposing RESTful APIs, JWT tenant isolation, rate limiting, and the central Agent Orchestrator.
- **Desktop Companion**: Optional local Python socket service confined to `./sandbox` for sandboxed file operations and gesture interaction.

```
                    ┌────────────────────────────┐
                    │    Next.js 16 Frontend     │
                    │  (Command Center / Studio) │
                    └─────────────┬──────────────┘
                                  │ HTTP / SSE
                    ┌─────────────▼──────────────┐
                    │   FastAPI Backend Core     │
                    │  (Orchestrator & Security) │
                    └──────┬──────┬───────┬──────┘
       ┌───────────────────┘      │       └───────────────────┐
┌──────▼──────┐            ┌──────▼──────┐             ┌──────▼──────┐
│  AI Router  │            │  Academic   │             │   Desktop   │
│  (Gemini /  │            │  Sources    │             │  Companion  │
│Claude/Ollama│            │(arXiv/DOIs) │             │ (./sandbox) │
└─────────────┘            └─────────────┘             └─────────────┘
```

---

## 3. Requirements
- **Python**: 3.11+ (tested on Python 3.13)
- **Node.js**: 18.17+ or 20+ (tested on Node.js 20+)
- **OS**: Windows, macOS, or Linux
- **Database**: SQLite (built-in default) or PostgreSQL 14+ for production

---

## 4. Installation

### Clone Repository
```bash
git clone https://github.com/your-org/antigravity-ai.git
cd antigravity-ai
```

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 5. Environment Variables
Copy `.env.example` in the root or `backend/` directory:
```bash
cp .env.example .env
```

Key variables:
- `SECRET_KEY`: 64-character secret key for JWT signing.
- `DATABASE_URL`: `sqlite:///./ai_research_dev.db` (or PostgreSQL connection string).
- `GEMINI_API_KEY`: Server-side API key from Google AI Studio.
- `ALLOWED_ORIGINS`: Comma-separated CORS origins (e.g. `http://localhost:3000`).
- `RATE_LIMIT_PER_MINUTE`: Max requests per IP (default `1000`).

---

## 6. Database Setup
SQLite is used out-of-the-box without setup. Tables auto-initialize on startup.
For production PostgreSQL:
```bash
# Apply schema migrations
psql -U postgres -d ai_research_db -f backend/db/migrations/schema.sql
```

---

## 7. AI Provider Setup
1. **Google Gemini (Default)**: Set `GEMINI_API_KEY` in `.env` or in UI under **Settings → AI Models**.
2. **Anthropic Claude (Fallback)**: Set `ANTHROPIC_API_KEY` in `.env`.
3. **OpenAI GPT-4o**: Set `OPENAI_API_KEY` in `.env`.
4. **Local Ollama**: Start Ollama locally (`ollama run llama3`) at `http://localhost:11434`.

---

## 8. Research API Setup
Academic sources operate without mandatory keys:
- **arXiv**: Public Atom XML query API.
- **OpenAlex**: Open Science REST API.
- **Crossref**: Public DOI Works REST API.
- **Semantic Scholar**: Optional API key elevates request rate limits (`SEMANTIC_SCHOLAR_API_KEY`).

---

## 9. Running Frontend
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```
For production build:
```bash
npm run build
npm start
```

---

## 10. Running Backend
```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation: `http://127.0.0.1:8000/docs`

---

## 11. Running Background Jobs
Continuous preprint monitoring runs via an in-process async scheduler (`MonitoringScheduler`).
To start scheduled polling manually:
```python
from app.services.monitoring_scheduler import monitoring_scheduler
import asyncio
asyncio.run(monitoring_scheduler.run_scheduled_checks())
```

---

## 12. Desktop Companion Setup (Optional)
The desktop companion is strictly optional and confined to `./sandbox`:
```bash
cd desktop_agent
pip install -r requirements.txt
python agent.py
```
Pair via the 6-digit code generated in the Web UI under `/desktop`.

---

## 13. Voice Setup
Voice recognition uses the browser Web Speech API. Microphone access is strictly push-to-talk. The platform never listens continuously or in the background.

---

## 14. Security Model
- **Strict Trust Boundary**:
  `USER → AGENT → PLANNER → PERMISSION CHECK → TYPED TOOL → VALIDATION → EXECUTION → AUDIT LOG`
- **Zero Arbitrary Code Execution**: No `eval()`, `exec()`, or raw shell commands are exposed to the AI model.
- **SSRF Protection**: External requests block private IP spaces (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) and unsafe URI schemes (`javascript:`, `file:`, `data:`).
- **Prompt Injection Containment**: Retrieved literature is wrapped inside `<retrieved_evidence>` blocks with hardened system prompts treating external content as untrusted data.

---

## 15. Permissions Model
Tools are categorized by risk level:
- `LOW`: Search papers, read public metadata, view alerts. Executed directly.
- `MEDIUM`: Save local file in sandbox, modify research profile.
- `HIGH`: Delete paper, delete collection, send email. Requires explicit user confirmation.
- `CRITICAL`: Destructive actions. Always blocked or requires dual authorization.

---

## 16. Demo Mode
- **Toggle**: Click `Demo Mode` in the header or dashboard banner.
- **Separation**: Demo Mode uses deterministic, pre-compiled sample data. Demo records are never written to live user databases.
- **Guided Tour**: Includes an interactive 8-step walkthrough demonstrating question decomposition, DOI validation, library archiving, and desktop authorization.

---

## 17. Testing
Run the complete automated test suite (78 tests):
```bash
cd backend
py -m pytest -v
```
Test modules include:
- `test_phase8_rc_validation.py`: 15 explicit end-to-end user workflows.
- `test_phase6_integration.py`: Cross-user tenancy isolation and loop protection.
- `test_phase5.py`: Desktop sandboxing, browser safety, emergency stop.
- `test_phase4.py`: Plugins, model routing, voice safety.
- `test_phase3_monitoring.py`: Research profiles and alert pipelines.
- `test_deep_research_engine.py`: Evidence synthesis and injection containment.

---

## 18. Deployment
- **Frontend**: Deployable to Vercel, AWS Amplify, or Docker container.
- **Backend**: Deployable as a systemd service, AWS ECS, or Dockerized FastAPI app.
- **Production Checklist**:
  1. Set `DEBUG=false` in `.env`.
  2. Set a high-entropy `SECRET_KEY`.
  3. Configure production PostgreSQL `DATABASE_URL`.
  4. Set `ALLOWED_ORIGINS` to production domains.

---

## 19. Known Limitations
1. **Academic API Quotas**: Unauthenticated requests to Semantic Scholar and Crossref are subject to public IP rate limits. Supplying an optional API key in Settings elevates quotas.
2. **Experimental Replication**: AI synthesis accelerates literature search but cannot replace physical laboratory experimental validation.
3. **Local Desktop Socket**: The desktop companion requires network adjacency or a secure tunnel to communicate with the web dashboard.

---

## 20. Troubleshooting
- **Backend connection error**: Verify FastAPI is running at `http://127.0.0.1:8000`.
- **429 Rate Limit**: Rapid automated requests trigger the rate limiter (1000 req/min). Set `TESTING=1` during development benchmarks.
- **Citation Unverified**: If a paper is not yet indexed in CrossRef or arXiv, it is labeled `UNVERIFIED SOURCE` without hallucinated replacement DOIs.
