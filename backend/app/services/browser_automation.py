"""
Controlled Browser Automation Service — Phase 5

Provides safe, isolated browser interaction for scholarly literature and public web research.
Defenses:
- URL safety & SSRF filtering (rejects javascript:, file:, data:, private IPs)
- User-Takeover Handoff: Detects authentication/CAPTCHA barriers and hands control to user
- Strict Isolation: External HTML/text is treated as untrusted data and sanitized
- Never stores or requests passwords, cookies, or session tokens
"""

import re
import logging
from typing import Dict, Any, Optional, List
from html.parser import HTMLParser
import httpx

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    BeautifulSoup = None
    HAS_BS4 = False

from app.services.source_adapter import validate_url, sanitize_text


class _SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.title = ""
        self.headings = []
        self.links = []
        self.current_tag = ""
        self.ignore = False

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag.lower()
        if self.current_tag in ["script", "style", "iframe", "noscript", "svg"]:
            self.ignore = True
        elif self.current_tag == "a":
            href = dict(attrs).get("href")
            if href and href.startswith("http"):
                self.links.append({"href": href, "text": ""})

    def handle_endtag(self, tag):
        if tag.lower() in ["script", "style", "iframe", "noscript", "svg"]:
            self.ignore = False
        self.current_tag = ""

    def handle_data(self, data):
        if not self.ignore and data.strip():
            text = data.strip()
            if self.current_tag == "title" and not self.title:
                self.title = text
            elif self.current_tag in ["h1", "h2", "h3"] and len(self.headings) < 8:
                self.headings.append(text)
            elif self.current_tag == "a" and self.links and not self.links[-1]["text"]:
                self.links[-1]["text"] = text[:50]
            self.text_parts.append(text)

    def get_text(self) -> str:
        return " ".join(self.text_parts)

logger = logging.getLogger(__name__)

# Keywords indicating login, CAPTCHA, or access restriction barrier requiring human takeover
TAKEOVER_PATTERNS = [
    r"\b(sign\s*in|log\s*in|login|enter\s*password)\b",
    r"\b(captcha|recaptcha|hcaptcha|cloudflare\s*turnstile|challenge)\b",
    r"\b(paywall|subscribe\s*to\s*read|subscription\s*required)\b",
    r"\b(two-factor|2fa|verification\s*code|authenticate\s*device)\b"
]


class BrowserAutomationService:
    """
    Controlled Browser Automation Engine.
    Executes public research extraction and source navigation safely.
    """

    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "Antigravity-Research-Desktop/5.0 (Scholarly public reader; +https://antigravity.ai)"
        }

    async def navigate_and_inspect(self, url: str) -> Dict[str, Any]:
        """
        Navigate to a URL and inspect its public contents.
        Checks for login / CAPTCHA barriers and signals User Takeover mode if detected.
        """
        is_safe, err = validate_url(url)
        if not is_safe:
            return {
                "success": False,
                "error": f"Security restriction: {err}",
                "requires_user_takeover": False
            }

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                headers=self.headers,
                follow_redirects=True,
                max_redirects=4
            ) as client:
                resp = await client.get(url)
                html_text = resp.text

            if HAS_BS4 and BeautifulSoup is not None:
                soup = BeautifulSoup(html_text, "html.parser")
                for script in soup(["script", "style", "iframe", "noscript", "svg"]):
                    script.decompose()
                page_title = soup.title.string.strip() if soup.title and soup.title.string else "Untitled Page"
                body_text = soup.get_text(separator=" ", strip=True)
                headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"])[:8]]
                links = [
                    {"text": a.get_text(strip=True)[:50], "href": a.get("href")}
                    for a in soup.find_all("a", href=True)[:10]
                    if a.get("href", "").startswith("http")
                ]
            else:
                parser = _SimpleHTMLTextExtractor()
                parser.feed(html_text)
                page_title = parser.title or "Untitled Page"
                body_text = parser.get_text()
                headings = parser.headings
                links = parser.links

            # Check for User-Takeover barrier (login, CAPTCHA, paywall)
            lower_body = body_text.lower()[:3000]
            for pattern in TAKEOVER_PATTERNS:
                if re.search(pattern, lower_body):
                    return {
                        "success": True,
                        "url": url,
                        "title": page_title,
                        "requires_user_takeover": True,
                        "takeover_prompt": (
                            f"The website at '{page_title}' requires manual user interaction (sign-in or verification). "
                            "Please complete the interaction manually in your browser, then click Continue."
                        ),
                        "takeover_url": url,
                        "text_sample": sanitize_text(body_text, max_length=500)
                    }

            return {
                "success": True,
                "url": url,
                "title": page_title,
                "requires_user_takeover": False,
                "content_preview": sanitize_text(body_text, max_length=2000),
                "headings": headings,
                "links": links
            }

        except Exception as exc:
            logger.error(f"Browser navigation error for {url}: {exc}")
            return {
                "success": False,
                "error": f"Failed to access web page: {str(exc)[:200]}",
                "requires_user_takeover": False
            }

    async def search_web(self, query: str, limit: int = 5) -> Dict[str, Any]:
        """
        Public web search across open academic & scientific discovery indices.
        """
        from app.services.academic_sources import academic_source_service
        try:
            # Query scholarly corpus via academic service
            results = await academic_source_service.search_all(query, limit=limit)
            return {
                "success": True,
                "query": query,
                "results_count": len(results),
                "results": [
                    {
                        "title": r.get("title"),
                        "authors": r.get("authors"),
                        "url": r.get("url"),
                        "snippet": r.get("abstract", "")[:250],
                        "source": r.get("venue") or r.get("source_db")
                    }
                    for r in results
                ]
            }
        except Exception as exc:
            return {"success": False, "error": str(exc), "results": []}

    async def extract_structured_text(self, url: str, target_topic: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract scholarly text excerpts and citations from a web publication page.
        """
        res = await self.navigate_and_inspect(url)
        if not res.get("success"):
            return res

        if res.get("requires_user_takeover"):
            return res

        raw_text = res.get("content_preview", "")
        return {
            "success": True,
            "url": url,
            "title": res.get("title"),
            "extracted_text": raw_text,
            "word_count": len(raw_text.split()),
            "privacy_scope": "LOCAL_ONLY"
        }


browser_automation = BrowserAutomationService()
