import os
import json
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class AIProviderInterface:
    """Base interface for all AI model providers."""
    
    def is_configured(self) -> bool:
        raise NotImplementedError

    def get_available_models(self) -> List[Dict[str, Any]]:
        raise NotImplementedError

    async def generate_response(
        self,
        prompt: str,
        model_name: str = "gemini-1.5-pro",
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        raise NotImplementedError

    async def generate_stream(
        self,
        prompt: str,
        model_name: str = "gemini-1.5-pro",
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> AsyncGenerator[str, None]:
        raise NotImplementedError


class GeminiProvider(AIProviderInterface):
    """
    Official Google Gemini API Provider with streaming, conversation history,
    retry backoff, and robust error handling.
    """

    AVAILABLE_MODELS = [
        {
            "id": "gemini-1.5-pro",
            "name": "Gemini 1.5 Pro",
            "description": "2M token context window. Optimal for deep academic synthesis and citation analysis.",
            "provider": "google",
            "context_length": "2,000,000 tokens",
        },
        {
            "id": "gemini-1.5-flash",
            "name": "Gemini 1.5 Flash",
            "description": "Low-latency multimodal model for fast conversational QA and literature exploration.",
            "provider": "google",
            "context_length": "1,000,000 tokens",
        },
        {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
            "description": "Next-gen multimodal reasoning and tool-calling foundation.",
            "provider": "google",
            "context_length": "1,000,000 tokens",
        },
    ]

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")

    def is_configured(self) -> bool:
        current_key = self.api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        return bool(current_key and current_key.strip())

    def get_available_models(self) -> List[Dict[str, Any]]:
        configured = self.is_configured()
        return [
            {**model, "is_configured": configured}
            for model in self.AVAILABLE_MODELS
        ]

    def _get_active_key(self) -> str:
        return self.api_key or settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")

    @staticmethod
    def _clean_model_name(model_name: str) -> str:
        clean = (model_name or "gemini-1.5-flash").strip()
        for prefix in ("gemini:", "google/", "models/"):
            if clean.startswith(prefix):
                clean = clean[len(prefix):]
        return clean or "gemini-1.5-flash"

    @classmethod
    def _get_candidate_models(cls, model_name: str) -> List[str]:
        clean = cls._clean_model_name(model_name)
        candidates = [clean]
        if "2.0" in clean:
            if not clean.endswith("-exp"):
                candidates.append(f"{clean}-exp")
            candidates.append("gemini-1.5-flash")
            candidates.append("gemini-1.5-pro")
        elif "1.5-pro" in clean:
            candidates.append("gemini-1.5-flash")
        elif "1.5-flash" in clean:
            candidates.append("gemini-1.5-pro")
        else:
            candidates.extend(["gemini-1.5-flash", "gemini-1.5-pro"])

        seen = set()
        deduped = []
        for c in candidates:
            if c not in seen:
                seen.add(c)
                deduped.append(c)
        return deduped

    async def generate_response(
        self,
        prompt: str,
        model_name: str = "gemini-1.5-pro",
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "error": True,
                "status_code": 401,
                "message": (
                    "Gemini API Key is not configured. Please add your key in the Settings page "
                    "or set the GEMINI_API_KEY environment variable to enable real AI generation."
                ),
                "content": None,
                "model": model_name
            }

        key = self._get_active_key()
        max_retries = 3
        backoff_delay = 1.0

        for attempt in range(max_retries):
            try:
                # 1. First attempt: Official google-genai SDK
                try:
                    from google import genai
                    from google.genai import types

                    client = genai.Client(api_key=key)
                    
                    config_args: Dict[str, Any] = {"temperature": temperature}
                    if system_instruction:
                        config_args["system_instruction"] = system_instruction

                    # Build content with history if provided
                    contents: List[Any] = []
                    if history:
                        for msg in history:
                            role = "user" if msg.get("role") == "user" else "model"
                            contents.append(types.Content(
                                role=role,
                                parts=[types.Part.from_text(text=msg.get("content", ""))]
                            ))
                    contents.append(prompt)

                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(**config_args)
                    )

                    token_count = (
                        response.usage_metadata.total_token_count
                        if response.usage_metadata
                        else len(prompt.split()) + len(response.text.split())
                    )

                    return {
                        "error": False,
                        "content": response.text,
                        "tokens_used": token_count,
                        "model": model_name,
                    }

                except Exception as sdk_err:
                    logger.debug(f"Official SDK call failed ({sdk_err}), trying direct HTTP REST fallback.")

                # 2. Direct HTTP REST API fallback
                import httpx
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
                headers = {"Content-Type": "application/json"}

                contents_payload: List[Dict[str, Any]] = []
                if history:
                    for msg in history:
                        role = "user" if msg.get("role") == "user" else "model"
                        contents_payload.append({
                            "role": role,
                            "parts": [{"text": msg.get("content", "")}]
                        })
                contents_payload.append({
                    "role": "user",
                    "parts": [{"text": prompt}]
                })

                payload: Dict[str, Any] = {
                    "contents": contents_payload,
                    "generationConfig": {"temperature": temperature}
                }
                if system_instruction:
                    payload["systemInstruction"] = {
                        "parts": [{"text": system_instruction}]
                    }

                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            text = "".join(p.get("text", "") for p in parts)
                            tokens = data.get("usageMetadata", {}).get("totalTokenCount", 0)
                            return {
                                "error": False,
                                "content": text,
                                "tokens_used": tokens,
                                "model": model_name
                            }
                        return {
                            "error": True,
                            "status_code": 500,
                            "message": "Empty candidate response from Gemini API.",
                            "content": None
                        }
                    elif resp.status_code in (429, 503) and attempt < max_retries - 1:
                        # Rate limit or transient error -> exponential backoff
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    else:
                        error_detail = resp.json().get("error", {}).get("message", resp.text)
                        return {
                            "error": True,
                            "status_code": resp.status_code,
                            "message": f"Gemini API Error ({resp.status_code}): {error_detail}",
                            "content": None
                        }

            except Exception as ex:
                if attempt < max_retries - 1:
                    await asyncio.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                return {
                    "error": True,
                    "status_code": 500,
                    "message": f"Network error connecting to Gemini API: {str(ex)}",
                    "content": None
                }

        return {
            "error": True,
            "status_code": 500,
            "message": "Max retries exceeded while calling Gemini API.",
            "content": None
        }

    async def generate_stream(
        self,
        prompt: str,
        model_name: str = "gemini-1.5-pro",
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3
    ) -> AsyncGenerator[str, None]:
        if not self.is_configured():
            err_msg = (
                "Gemini API Key is not configured. Please add your key in the Settings page "
                "or set the GEMINI_API_KEY environment variable to enable real AI generation."
            )
            yield f"data: {{\"error\": true, \"message\": {json.dumps(err_msg)}}}\n\n"
            return

        key = self._get_active_key()
        candidate_models = self._get_candidate_models(model_name)
        
        try:
            # Attempt streaming via official SDK
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=key)
                config_args: Dict[str, Any] = {"temperature": temperature}
                if system_instruction:
                    config_args["system_instruction"] = system_instruction

                contents: List[Any] = []
                if history:
                    for msg in history:
                        role = "user" if msg.get("role") == "user" else "model"
                        contents.append(types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=msg.get("content", ""))]
                        ))
                contents.append(prompt)

                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(**config_args)
                )

                for chunk in response_stream:
                    if chunk.text:
                        yield f"data: {{\"chunk\": {json.dumps(chunk.text)}}}\n\n"
                
                yield "data: [DONE]\n\n"
                return

            except Exception as stream_sdk_err:
                logger.debug(f"Official SDK stream failed ({stream_sdk_err}), falling back to direct HTTP stream.")

            # Fallback to direct HTTP SSE stream with candidate model fallback
            import httpx
            headers = {"Content-Type": "application/json"}

            contents_payload: List[Dict[str, Any]] = []
            if history:
                for msg in history:
                    role = "user" if msg.get("role") == "user" else "model"
                    contents_payload.append({
                        "role": role,
                        "parts": [{"text": msg.get("content", "")}]
                    })
            contents_payload.append({
                "role": "user",
                "parts": [{"text": prompt}]
            })

            payload: Dict[str, Any] = {
                "contents": contents_payload,
                "generationConfig": {"temperature": temperature}
            }
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }

            async with httpx.AsyncClient(timeout=60.0) as client:
                for cur_model in candidate_models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{cur_model}:streamGenerateContent?alt=sse&key={key}"
                    async with client.stream("POST", url, json=payload, headers=headers) as response:
                        if response.status_code == 404 and cur_model != candidate_models[-1]:
                            logger.warning(f"Model {cur_model} returned 404, trying next candidate in {candidate_models}...")
                            continue

                        if response.status_code != 200:
                            err_text = await response.aread()
                            error_detail = "Unknown error"
                            try:
                                err_json = json.loads(err_text.decode('utf-8', errors='ignore'))
                                error_detail = err_json.get("error", {}).get("message", str(err_json))
                            except Exception:
                                error_detail = err_text.decode('utf-8', errors='ignore')

                            err_payload = {"error": True, "message": f"Gemini API error ({response.status_code}): {error_detail}"}
                            yield f"data: {json.dumps(err_payload)}\n\n"
                            return

                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                json_str = line[6:].strip()
                                if json_str:
                                    try:
                                        chunk_data = json.loads(json_str)
                                        candidates = chunk_data.get("candidates", [])
                                        if candidates:
                                            parts = candidates[0].get("content", {}).get("parts", [])
                                            for part in parts:
                                                text_piece = part.get("text", "")
                                                if text_piece:
                                                    yield f"data: {json.dumps({'chunk': text_piece})}\n\n"
                                    except Exception:
                                        pass

                        yield "data: [DONE]\n\n"
                        return

        except Exception as e:
            yield f"data: {{\"error\": true, \"message\": \"Streaming error: {str(e)}\"}}\n\n"


class OpenAIProvider(AIProviderInterface):
    """Modular OpenAI Provider stub - ready when OPENAI_API_KEY is supplied."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "description": "High intelligence flagship model.",
                "provider": "openai",
                "context_length": "128,000 tokens",
                "is_configured": self.is_configured()
            }
        ]

    async def generate_response(self, prompt: str, **kwargs) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "error": True,
                "status_code": 401,
                "message": "OpenAI API Key is not configured.",
                "content": None
            }
        return {"error": True, "message": "OpenAI provider ready for activation."}

    async def generate_stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        yield "data: {\"error\": true, \"message\": \"OpenAI API Key not configured.\"}\n\n"


class AnthropicClaudeProvider(AIProviderInterface):
    """Modular Anthropic Claude Provider stub - ready when ANTHROPIC_API_KEY is supplied."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_available_models(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "claude-3-5-sonnet",
                "name": "Claude 3.5 Sonnet",
                "description": "Advanced reasoning and coding intelligence.",
                "provider": "anthropic",
                "context_length": "200,000 tokens",
                "is_configured": self.is_configured()
            }
        ]

    async def generate_response(self, prompt: str, **kwargs) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "error": True,
                "status_code": 401,
                "message": "Anthropic API Key is not configured.",
                "content": None
            }
        return {"error": True, "message": "Claude provider ready for activation."}

    async def generate_stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        yield "data: {\"error\": true, \"message\": \"Anthropic API Key not configured.\"}\n\n"


class AIProviderFactory:
    """Factory for selecting and listing model providers."""

    @staticmethod
    def get_provider(provider_name: str = "gemini", api_key: Optional[str] = None) -> AIProviderInterface:
        provider_name = provider_name.lower()
        if "openai" in provider_name or "gpt" in provider_name:
            return OpenAIProvider(api_key=api_key)
        elif "claude" in provider_name or "anthropic" in provider_name:
            return AnthropicClaudeProvider(api_key=api_key)
        else:
            return GeminiProvider(api_key=api_key)

    @staticmethod
    def get_all_available_models() -> List[Dict[str, Any]]:
        gemini = GeminiProvider()
        openai = OpenAIProvider()
        claude = AnthropicClaudeProvider()

        all_models = []
        all_models.extend(gemini.get_available_models())
        all_models.extend(openai.get_available_models())
        all_models.extend(claude.get_available_models())
        return all_models

    @staticmethod
    def get_configured_providers() -> List[str]:
        configured = []
        if GeminiProvider().is_configured():
            configured.append("gemini")
        if OpenAIProvider().is_configured():
            configured.append("openai")
        if AnthropicClaudeProvider().is_configured():
            configured.append("anthropic")
        return configured

ai_factory = AIProviderFactory()
