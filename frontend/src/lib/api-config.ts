// Centralized API Base URL with smart cloud fallback
function getApiRoot(): string {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
  }
  
  // If running in browser on a cloud host (e.g. *.vercel.app), default to the live Render backend
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://aiagent-pci7.onrender.com";
  }
  
  return "http://127.0.0.1:8000";
}

export const API_ROOT = getApiRoot();
export const API_BASE = `${API_ROOT}/api/v1`;
