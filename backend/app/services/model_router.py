"""
Model Router Service — Phase 4

Routes AI tasks to the most appropriate configured model based on task type.
Respects user-defined routing preferences (ModelRouteConfig) when set.
Falls back to the platform-level Gemini provider if no user config exists.

Task types:
- chat: Standard conversational queries
- research: Deep research planning and synthesis
- summarization: Document or paper summarization
- fast: Simple factual queries or classification
- reasoning: Complex multi-step reasoning

Provider abstraction allows adding OpenAI, Anthropic, etc. later.
"""

import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.config import settings
from app.services.ai_provider import GeminiProvider, AIProviderInterface

logger = logging.getLogger(__name__)

# ─── Provider Registry ─────────────────────────────────────────────────────────

PROVIDER_CATALOGUE: List[Dict[str, Any]] = [
    {
        "slug": "gemini",
        "name": "Google Gemini",
        "description": "Google's Gemini family of models. Supports gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash.",
        "website": "https://aistudio.google.com",
        "key_env_var": "GEMINI_API_KEY",
        "requires_api_key": True,
        "models": [
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "roles": ["research", "reasoning", "chat"],
                "context_length": "2,000,000 tokens",
                "description": "Best for complex research synthesis, long-context analysis.",
                "speed": "medium",
                "cost": "medium",
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "roles": ["chat", "fast", "summarization"],
                "context_length": "1,000,000 tokens",
                "description": "Fast and efficient for chat and quick queries.",
                "speed": "fast",
                "cost": "low",
            },
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "roles": ["chat", "fast", "reasoning"],
                "context_length": "1,000,000 tokens",
                "description": "Next-gen multimodal reasoning and tool-calling.",
                "speed": "fast",
                "cost": "low",
            },
        ],
    },
    {
        "slug": "openai",
        "name": "OpenAI",
        "description": "OpenAI GPT-4o and GPT-4o-mini. Requires an OpenAI API key.",
        "website": "https://platform.openai.com",
        "key_env_var": "OPENAI_API_KEY",
        "requires_api_key": True,
        "models": [
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "roles": ["research", "reasoning", "chat"],
                "context_length": "128,000 tokens",
                "description": "OpenAI's most capable model.",
                "speed": "medium",
                "cost": "high",
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "roles": ["chat", "fast", "summarization"],
                "context_length": "128,000 tokens",
                "description": "Faster and cheaper. Good for chat and summarization.",
                "speed": "fast",
                "cost": "low",
            },
        ],
        "availability_status": "not_configured",  # No adapter implemented yet
        "implementation_note": "OpenAI adapter is not yet implemented. Add OPENAI_API_KEY and the provider adapter to enable.",
    },
    {
        "slug": "anthropic",
        "name": "Anthropic Claude",
        "description": "Anthropic's Claude 3.5 Sonnet and Claude 3 Haiku.",
        "website": "https://console.anthropic.com",
        "key_env_var": "ANTHROPIC_API_KEY",
        "requires_api_key": True,
        "models": [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "roles": ["research", "reasoning", "chat"],
                "context_length": "200,000 tokens",
                "description": "Anthropic's best model for complex reasoning.",
                "speed": "medium",
                "cost": "medium",
            },
            {
                "id": "claude-3-haiku-20240307",
                "name": "Claude 3 Haiku",
                "roles": ["chat", "fast", "summarization"],
                "context_length": "200,000 tokens",
                "description": "Fast and affordable for chat and summarization.",
                "speed": "fast",
                "cost": "low",
            },
        ],
        "availability_status": "not_configured",
        "implementation_note": "Anthropic adapter is not yet implemented. Add ANTHROPIC_API_KEY and the provider adapter to enable.",
    },
    {
        "slug": "local",
        "name": "Local / OpenAI-Compatible",
        "description": "Self-hosted model via Ollama, LM Studio, or any OpenAI-compatible endpoint.",
        "website": "https://ollama.com",
        "key_env_var": None,
        "requires_api_key": False,
        "models": [],
        "availability_status": "not_configured",
        "implementation_note": "Local model adapter not yet implemented. Will support OpenAI-compatible /v1/chat/completions endpoints.",
    },
]

# Default model routing rules (used when no user config exists)
DEFAULT_ROUTING: Dict[str, str] = {
    "chat": "gemini:gemini-1.5-flash",
    "research": "gemini:gemini-1.5-pro",
    "summarization": "gemini:gemini-1.5-flash",
    "fast": "gemini:gemini-1.5-flash",
    "reasoning": "gemini:gemini-1.5-pro",
}


class ModelRouter:
    """
    Routes task types to appropriate configured models.
    Respects user routing preferences when available.
    Falls back to platform defaults.
    """

    def get_provider_catalogue(self, check_configured: bool = True) -> List[Dict[str, Any]]:
        """Return provider list with current configuration status."""
        import os
        result = []
        for provider in PROVIDER_CATALOGUE:
            entry = dict(provider)
            if check_configured:
                env_var = provider.get("key_env_var")
                if env_var:
                    key = getattr(settings, env_var.replace("_API_KEY", "").lower() + "_api_key", None) or os.getenv(env_var, "")
                    entry["is_configured"] = bool(key and key.strip())
                else:
                    entry["is_configured"] = provider.get("availability_status") == "available"
            result.append(entry)
        return result

    def get_gemini_provider(self) -> GeminiProvider:
        """Return the platform-level Gemini provider."""
        return GeminiProvider()

    def resolve_model_for_task(
        self,
        task_type: str,
        user_route_config=None,
        override_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Resolve which provider+model to use for a given task type.
        Returns: {provider_slug, model_id, model_name, reason}
        """
        if override_model:
            if ":" in override_model:
                provider_slug, model_id = override_model.split(":", 1)
            else:
                provider_slug, model_id = "gemini", override_model
            return {
                "provider_slug": provider_slug,
                "model_id": model_id,
                "model_name": model_id,
                "reason": "user_override",
            }

        # Check user routing config
        if user_route_config and not user_route_config.auto_route_enabled:
            route_map = {
                "chat": user_route_config.chat_model,
                "research": user_route_config.research_model,
                "summarization": user_route_config.summarization_model,
                "fast": user_route_config.fast_model,
                "reasoning": user_route_config.reasoning_model,
            }
            configured = route_map.get(task_type)
            if configured and ":" in configured:
                provider_slug, model_id = configured.split(":", 1)
                return {
                    "provider_slug": provider_slug,
                    "model_id": model_id,
                    "model_name": model_id,
                    "reason": "user_routing_config",
                }

        # Platform default routing
        default = DEFAULT_ROUTING.get(task_type, DEFAULT_ROUTING["chat"])
        provider_slug, model_id = default.split(":", 1)
        return {
            "provider_slug": provider_slug,
            "model_id": model_id,
            "model_name": model_id,
            "reason": "platform_default",
        }


model_router = ModelRouter()
