# Data Inventory & Privacy Audit — Phase 6

| Data Category | Stored? | Storage Location | Purpose | Retention | User Deletion Capability? | Transmitted to External AI? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **User Account** | Yes | `users` DB table | Authentication & user tenancy | Until account deletion | Yes (Admin/User API) | No |
| **Passwords** | Yes (Hashed) | `users.hashed_password` | Secure password comparison | Permanent until changed | Yes (via password update) | No |
| **API Keys (User-configured)**| Yes (Encrypted)| `ai_provider_configs.api_key_encrypted` | Authenticating to OpenAI/Anthropic/Gemini | Until user removes provider | Yes (via Settings API) | No (Never exposed in frontend) |
| **Research History & Reports**| Yes | `research_projects` DB table | Preserving synthesis, sub-questions, and findings | Permanent until deleted | Yes (DELETE `/api/v1/research/projects/{id}`) | Sent to selected AI provider for synthesis |
| **Research Interests** | Yes | `research_profiles` DB table | Personalized literature discovery | Permanent until updated | Yes (DELETE `/api/v1/profiles/{id}`) | No |
| **Saved Papers** | Yes | `saved_papers` DB table | User's personal citation library | Permanent until deleted | Yes (DELETE `/api/v1/library/papers/{id}`) | No |
| **Discovered Papers** | Yes | `discovered_publications` table | Alerting & deduplication cache | 90 days default | Yes (Cascade on alert purge) | No |
| **Publication Alerts** | Yes | `notification_alerts` table | Real-time smart research notifications | Until user dismisses | Yes (POST `/api/v1/alerts/read-all`) | No |
| **Local Sandboxed Files** | Yes | `./sandbox/` filesystem | Sandboxed document summaries & outputs | User controlled | Yes (Local filesystem deletion) | Only if user explicitly requests cloud synthesis |
| **Voice Input / Transcripts** | Yes (Text only)| `tool_executions` / conversations | Chat history & voice queries | Session / DB history | Yes (Delete conversation) | Transcribed text sent to AI; raw audio is ephemeral |
| **Plugin Configurations** | Yes (Masked) | `user_plugin_installs` | Plugin credentials & preferences | Until uninstalled | Yes (DELETE `/api/v1/plugins/{slug}`) | No |
| **Desktop Companion Activity**| Yes | `desktop_task_executions` | Security audit trail & forensic review | 30 days default | Yes | No |
| **Camera Video Frames** | **NO** | Ephemeral RAM only | Real-time gesture recognition (MediaPipe) | **0 seconds (Disposed immediately)** | N/A (Never saved) | **NO (Zero cloud transmission)** |
