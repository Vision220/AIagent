from typing import List, Dict, Any

class PluginManagerService:
    def get_available_plugins(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": 1,
                "slug": "arxiv-deep-indexer",
                "name": "ArXiv Deep Indexer",
                "description": "Parses LaTeX sources, equations, and citation graphs directly from ArXiv preprints.",
                "category": "Academic Index",
                "author": "AI Research Labs",
                "version": "1.2.0",
                "permissions_required": ["network_read", "latex_parse"],
                "is_enabled": True
            },
            {
                "id": 2,
                "slug": "code-interpreter-sandbox",
                "name": "Python Code Sandbox",
                "description": "Executes data analysis, plotting, and mathematical simulations in an isolated container.",
                "category": "Code Exec",
                "author": "Antigravity Devs",
                "version": "2.0.1",
                "permissions_required": ["isolated_compute", "chart_render"],
                "is_enabled": False
            },
            {
                "id": 3,
                "slug": "semantic-scholar-graph",
                "name": "Semantic Citation Explorer",
                "description": "Visualizes citation trees, influential references, and co-authorship networks.",
                "category": "Academic Index",
                "author": "Allen AI Community",
                "version": "1.0.4",
                "permissions_required": ["api_read"],
                "is_enabled": True
            },
            {
                "id": 4,
                "slug": "whisper-voice-assistant",
                "name": "Voice Dictation & Control",
                "description": "Enables voice-to-text dictation, query speak back, and hands-free navigation.",
                "category": "Voice & Audio",
                "author": "Voice Core",
                "version": "1.1.0",
                "permissions_required": ["microphone_access", "audio_playback"],
                "is_enabled": False
            },
            {
                "id": 5,
                "slug": "bibtex-zotero-sync",
                "name": "Zotero & BibTeX Sync",
                "description": "Automatically syncs saved papers and annotations to your Zotero desktop library.",
                "category": "Data Extraction",
                "author": "Open Science Alliance",
                "version": "1.3.2",
                "permissions_required": ["external_storage_write"],
                "is_enabled": False
            }
        ]

plugin_manager = PluginManagerService()
