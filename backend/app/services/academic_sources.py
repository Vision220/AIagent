import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import httpx
import logging

logger = logging.getLogger(__name__)

USER_AGENT = "Antigravity-Research-Assistant/2.0 (mailto:researcher@antigravity.ai)"

def clean_text(text: Optional[str]) -> str:
    """Sanitize and clean external text, removing control characters and HTML/XML tags."""
    if not text:
        return ""
    # Strip HTML/XML tags
    cleaned = re.sub(r"<[^>]+>", " ", text)
    # Normalize whitespaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def reconstruct_openalex_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """Reconstruct plain-text abstract from OpenAlex inverted index structure."""
    if not inverted_index:
        return "Abstract not provided by repository."
    word_positions = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_positions.append((pos, word))
    word_positions.sort(key=lambda x: x[0])
    reconstructed = " ".join(w for _, w in word_positions)
    return clean_text(reconstructed)

class AcademicSourceService:
    """
    Academic Source discovery engine querying real scholarly repositories:
    - arXiv (Preprint Atom API)
    - OpenAlex (Open scientific corpus API)
    - Crossref (Publisher DOI & Metadata API)
    - Semantic Scholar (Academic graph API)
    """

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout
        self.headers = {"User-Agent": USER_AGENT}

    async def search_arxiv(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search arXiv via public Atom API."""
        encoded_q = urllib.parse.quote(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_q}&start=0&max_results={limit}&sortBy=relevance"
        results = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"arXiv API returned status {resp.status_code}")
                    return results

                root = ET.fromstring(resp.content)
                atom_ns = "{http://www.w3.org/2005/Atom}"
                arxiv_ns = "{http://arxiv.org/schemas/atom}"

                for entry in root.findall(f"{atom_ns}entry"):
                    title_elem = entry.find(f"{atom_ns}title")
                    summary_elem = entry.find(f"{atom_ns}summary")
                    id_elem = entry.find(f"{atom_ns}id")
                    published_elem = entry.find(f"{atom_ns}published")
                    doi_elem = entry.find(f"{arxiv_ns}doi")

                    title = clean_text(title_elem.text) if title_elem is not None else "Untitled arXiv Preprint"
                    abstract = clean_text(summary_elem.text) if summary_elem is not None else "Abstract not provided."
                    paper_url = id_elem.text.strip() if id_elem is not None else ""
                    
                    year = None
                    if published_elem is not None and published_elem.text:
                        year_match = re.match(r"^(\d{4})", published_elem.text)
                        if year_match:
                            year = int(year_match.group(1))

                    authors = []
                    for author_elem in entry.findall(f"{atom_ns}author"):
                        name_elem = author_elem.find(f"{atom_ns}name")
                        if name_elem is not None and name_elem.text:
                            authors.append(clean_text(name_elem.text))

                    doi = clean_text(doi_elem.text) if doi_elem is not None else None

                    # Find PDF link
                    pdf_url = None
                    for link_elem in entry.findall(f"{atom_ns}link"):
                        if link_elem.attrib.get("title") == "pdf" or "pdf" in link_elem.attrib.get("href", ""):
                            pdf_url = link_elem.attrib.get("href")
                            break

                    results.append({
                        "id": f"arxiv:{paper_url.split('/')[-1]}",
                        "source_db": "arXiv",
                        "title": title,
                        "authors": ", ".join(authors) if authors else "Unknown Authors",
                        "year": year,
                        "venue": "arXiv Preprint",
                        "doi": doi or (f"10.48550/arXiv.{paper_url.split('/')[-1]}" if paper_url else None),
                        "url": paper_url,
                        "pdf_url": pdf_url,
                        "abstract": abstract,
                        "citation_count": None,
                        "verified": True,
                    })
        except Exception as e:
            logger.warning(f"Error querying arXiv: {e}")

        return results

    async def search_openalex(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search OpenAlex open academic catalog API."""
        encoded_q = urllib.parse.quote(query)
        url = f"https://api.openalex.org/works?search={encoded_q}&per-page={limit}"
        results = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"OpenAlex API returned status {resp.status_code}")
                    return results

                data = resp.json()
                items = data.get("results", [])

                for item in items:
                    title = clean_text(item.get("title")) or "Untitled Scholarly Work"
                    year = item.get("publication_year")
                    doi = item.get("doi")
                    
                    # Extract venue
                    primary_loc = item.get("primary_location") or {}
                    source_obj = primary_loc.get("source") or {}
                    venue = source_obj.get("display_name") or "Peer-Reviewed Venue"

                    # Authors
                    authors_list = []
                    for auth in item.get("authorships", []):
                        author_data = auth.get("author") or {}
                        name = author_data.get("display_name")
                        if name:
                            authors_list.append(clean_text(name))

                    # Reconstruct abstract
                    abstract = reconstruct_openalex_abstract(item.get("abstract_inverted_index"))

                    # Paper links
                    paper_url = primary_loc.get("landing_page_url") or doi or item.get("id")
                    pdf_url = primary_loc.get("pdf_url")

                    results.append({
                        "id": f"openalex:{item.get('id', '').split('/')[-1]}",
                        "source_db": "OpenAlex",
                        "title": title,
                        "authors": ", ".join(authors_list) if authors_list else "Unknown Authors",
                        "year": year,
                        "venue": venue,
                        "doi": doi,
                        "url": paper_url,
                        "pdf_url": pdf_url,
                        "abstract": abstract,
                        "citation_count": item.get("cited_by_count", 0),
                        "verified": True,
                    })
        except Exception as e:
            logger.warning(f"Error querying OpenAlex: {e}")

        return results

    async def search_crossref(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Crossref DOI registration agency API."""
        encoded_q = urllib.parse.quote(query)
        url = f"https://api.crossref.org/works?query={encoded_q}&rows={limit}&sort=relevance"
        results = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Crossref API returned status {resp.status_code}")
                    return results

                data = resp.json()
                items = data.get("message", {}).get("items", [])

                for item in items:
                    titles = item.get("title", [])
                    title = clean_text(titles[0]) if titles else "Untitled Crossref Work"
                    doi = item.get("DOI")
                    paper_url = item.get("URL") or (f"https://doi.org/{doi}" if doi else "")
                    
                    # Publication year
                    pub_parts = item.get("published-print", item.get("published-online", {})).get("date-parts", [[None]])
                    year = pub_parts[0][0] if pub_parts and pub_parts[0] and isinstance(pub_parts[0][0], int) else None

                    # Venue
                    container_titles = item.get("container-title", [])
                    venue = clean_text(container_titles[0]) if container_titles else "Scholarly Publication"

                    # Authors
                    authors_list = []
                    for a in item.get("author", []):
                        given = a.get("given", "")
                        family = a.get("family", "")
                        name = f"{given} {family}".strip()
                        if name:
                            authors_list.append(clean_text(name))

                    abstract = clean_text(item.get("abstract")) or "Abstract available via publisher DOI."

                    results.append({
                        "id": f"crossref:{doi}" if doi else f"crossref:{len(results)+1}",
                        "source_db": "Crossref",
                        "title": title,
                        "authors": ", ".join(authors_list) if authors_list else "Unknown Authors",
                        "year": year,
                        "venue": venue,
                        "doi": doi,
                        "url": paper_url,
                        "pdf_url": None,
                        "abstract": abstract,
                        "citation_count": item.get("is-referenced-by-count", None),
                        "verified": True,
                    })
        except Exception as e:
            logger.warning(f"Error querying Crossref: {e}")

        return results

    async def search_semantic_scholar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Semantic Scholar academic graph API."""
        encoded_q = urllib.parse.quote(query)
        fields = "title,authors,year,abstract,venue,url,citationCount,openAccessPdf"
        url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={encoded_q}&limit={limit}&fields={fields}"
        results = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Semantic Scholar API returned status {resp.status_code}")
                    return results

                data = resp.json()
                items = data.get("data", [])

                for item in items:
                    title = clean_text(item.get("title")) or "Untitled Paper"
                    year = item.get("year")
                    venue = clean_text(item.get("venue")) or "Academic Conference / Journal"
                    abstract = clean_text(item.get("abstract")) or "Abstract not provided by Semantic Scholar."
                    paper_url = item.get("url") or ""
                    
                    pdf_obj = item.get("openAccessPdf") or {}
                    pdf_url = pdf_obj.get("url")

                    authors_list = [clean_text(a.get("name", "")) for a in item.get("authors", []) if a.get("name")]

                    results.append({
                        "id": f"semanticscholar:{item.get('paperId', '')[:10]}",
                        "source_db": "Semantic Scholar",
                        "title": title,
                        "authors": ", ".join(authors_list) if authors_list else "Unknown Authors",
                        "year": year,
                        "venue": venue,
                        "doi": None,
                        "url": paper_url,
                        "pdf_url": pdf_url,
                        "abstract": abstract,
                        "citation_count": item.get("citationCount"),
                        "verified": True,
                    })
        except Exception as e:
            logger.warning(f"Error querying Semantic Scholar: {e}")

        return results

    async def search_papers(
        self,
        query: str,
        sources: Optional[List[str]] = None,
        limit_per_source: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Queries all selected academic repositories, normalizes, deduplicates,
        and ranks results by relevance. Never fabricates fake papers.
        """
        if not query or not query.strip():
            return []

        sources = [s.lower() for s in (sources or ["arxiv", "openalex", "crossref", "semantic_scholar"])]
        all_results: List[Dict[str, Any]] = []

        # Query chosen sources
        if "arxiv" in sources:
            arxiv_res = await self.search_arxiv(query, limit=limit_per_source)
            all_results.extend(arxiv_res)

        if "openalex" in sources or "pubmed" in sources:
            openalex_res = await self.search_openalex(query, limit=limit_per_source)
            all_results.extend(openalex_res)

        if "crossref" in sources or "ieee" in sources:
            crossref_res = await self.search_crossref(query, limit=limit_per_source)
            all_results.extend(crossref_res)

        if "semantic_scholar" in sources:
            s2_res = await self.search_semantic_scholar(query, limit=limit_per_source)
            all_results.extend(s2_res)

        # Deduplicate results by normalized title
        seen_titles = set()
        deduped = []
        for paper in all_results:
            norm_title = re.sub(r"[^a-zA-Z0-9]", "", paper["title"].lower())
            if norm_title and norm_title not in seen_titles:
                seen_titles.add(norm_title)
                deduped.append(paper)

        # Relevance scoring based on term overlap
        keywords = set(re.findall(r"\w+", query.lower()))
        for paper in deduped:
            text_corpus = f"{paper['title']} {paper['abstract']} {paper['venue']}".lower()
            corpus_words = set(re.findall(r"\w+", text_corpus))
            overlap = len(keywords.intersection(corpus_words))
            
            # Additional small boost for citation count and recent publication
            citation_boost = min((paper.get("citation_count") or 0) / 500.0, 0.5)
            paper["relevance_score"] = round(overlap + citation_boost, 2)

        # Sort by relevance score descending
        deduped.sort(key=lambda p: p.get("relevance_score", 0), reverse=True)
        return deduped

academic_source_service = AcademicSourceService()
academic_aggregator = academic_source_service

