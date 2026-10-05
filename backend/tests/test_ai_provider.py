import pytest
from app.services.ai_provider import GeminiProvider

@pytest.mark.asyncio
async def test_gemini_missing_api_key_graceful_handling():
    # Pass empty API key to simulate unconfigured state
    provider = GeminiProvider(api_key="")
    assert not provider.is_configured()
    
    result = await provider.generate_response("Test prompt")
    assert result["error"] is True
    assert result["status_code"] == 401
    assert "not configured" in result["message"]

@pytest.mark.asyncio
async def test_gemini_stream_unconfigured():
    provider = GeminiProvider(api_key="")
    chunks = []
    async for chunk in provider.generate_stream("Hello"):
        chunks.append(chunk)
    
    assert len(chunks) > 0
    assert "not configured" in chunks[0]
