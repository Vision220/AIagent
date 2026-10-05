# Release Notes: Antigravity AI Academic Research Platform
**Version:** `v1.0.0-rc1` (Release Candidate 1)  
**Date:** October 2026  
**Status:** Validated Production Ready

---

## 1. Executive Summary

Antigravity AI Academic Research Platform is a unified, sovereign AI research partner designed for researchers, engineers, and scholars. It decomposes complex research questions, validates citations against real literature, tracks new publications, and coordinates desktop research safely.

The platform provides complete multi-model routing, zero citation hallucination guarantees via CrossRef and arXiv DOI verification, sandboxed desktop execution, hands-free voice studio, and end-to-end multi-tenant data isolation.

---

## 2. Key Architecture & Features

### Core AI & Deep Research
- **Deep Research Engine**: Autonomous 5-stage synthesis pipeline:
  1. *Understanding question* (Query decomposition)
  2. *Searching academic sources* (arXiv, OpenAlex, Crossref, Semantic Scholar)
  3. *Evaluating sources* (Relevance ranking, author disambiguation, DOI check)
  4. *Synthesizing findings* (Evidence extraction, pedagogical framing)
  5. *Final citation validation* (Strict DOI validation & verified vs. unverified provenance tagging)
- **Universal Agent Input**: Prominent orchestrator interface with natural keyword and intent detection (Deep Research, Literature Retrieval, Continuous Monitoring, Library Explorer, Desktop Automation, Synthesis Chat).
- **Multi-Format Export**: Production export to PDF (print-optimized), Markdown (`.md`), HTML (`.html`), and raw structured JSON (`.json`).

### Transparency & Trust
- **Four-Tier Provenance Classification**:
  - `VERIFIED SOURCE` (Validated via CrossRef / arXiv official registry)
  - `AI INTERPRETATION` (Synthesized analysis derived from evidence)
  - `USER-PROVIDED INFORMATION` (User prompt / context additions)
  - `UNVERIFIED INFORMATION` (External claims pending registry confirmation)
- **System Health & Diagnostics**: Live `/api/v1/health` monitoring FastAPI backend, SQLite/PostgreSQL database, AI reasoning engines, research APIs, background scheduler, and desktop socket.
- **Trust & Safety Center**: Plain-language disclaimers of AI limitations, non-scan guarantees of private files, and confirmation requirements.

### Desktop Companion & Local Control
- **Cryptographic PIN Handshake**: Pairing via time-limited 6-digit PIN.
- **Sandboxed Operations**: File reads and writes are strictly restricted to the `./sandbox` workspace. Arbitrary command execution is permanently disabled.
- **Emergency Stop Button**: Instant abort terminates running browser or desktop companion tasks.

### Personalization & Smart Monitoring
- **Personal AI Agent Profile**: User-defined Agent Name, Response Style (Academic, Concise, Comprehensive), Research Depth, Citation Preference (APA, IEEE, Chicago, BibTeX), and Confirmation Behavior.
- **Continuous Monitoring**: Cron-based background evaluation of pre-print servers with configurable alert cadence (Hourly, Daily, Weekly) and topic muting.

---

## 3. Required Environment Variables

See `.env.example` in repository root for complete template:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PROJECT_NAME` | Name of the platform | `"Antigravity AI Academic Research Platform"` |
| `ENVIRONMENT` | Deployment environment | `"production"` |
| `DEBUG` | Debug mode toggle | `false` |
| `SECRET_KEY` | JWT signing secret | 64-character random string |
| `DATABASE_URL` | Relational database connection | `sqlite:///./ai_research_dev.db` or PostgreSQL URI |
| `GEMINI_API_KEY` | Primary Google Gemini API key | Google AI Studio Key |
| `OPENAI_API_KEY` | Optional OpenAI key | `sk-...` |
| `ANTHROPIC_API_KEY` | Optional Anthropic key | `sk-ant-...` |
| `ALLOWED_ORIGINS` | CORS whitelist | `http://localhost:3000,https://yourdomain.com` |
| `RATE_LIMIT_PER_MINUTE` | Inbound request throttle | `1000` |
| `DESKTOP_SANDBOX_PATH` | Confined desktop folder | `./sandbox` |

---

## 4. Deployment Instructions

### A. Backend Core (FastAPI)
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### B. Frontend Gateway (Next.js 16)
```bash
cd frontend
npm install
npm run build
npm start -- -p 3000
```

### C. Desktop Companion Agent (Optional)
```bash
cd desktop_agent
pip install -r requirements.txt
python agent.py
```

---

## 5. Known Limitations
1. **Academic API Rate Limits**: Public open-access pools for Semantic Scholar and Crossref apply rate limits during heavy unauthenticated traffic. Supplying an optional API key in Settings elevates quotas.
2. **Local Desktop Companion**: The desktop socket requires local network adjacency or secure tunnel to pair with the web UI.
3. **Primary Experimental Replication**: AI synthesis is an accelerator for literature discovery and cannot replace physical laboratory peer review.
