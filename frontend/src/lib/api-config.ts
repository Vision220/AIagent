// Centralized API Base URL for local development and cloud production deployment
export const API_ROOT = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export const API_BASE = `${API_ROOT}/api/v1`;
