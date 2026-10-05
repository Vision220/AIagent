from typing import List, Dict, Any

class PublicationAlertService:
    def get_demo_feed(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "alert-item-1",
                "topic": "Quantum Machine Learning",
                "paper_title": "Variational Quantum Circuit Optimization via Reinforcement Learning",
                "authors": "Dr. Sophia Lin, Mark Vance",
                "published_date": "2026-10-04",
                "venue": "ArXiv:2610.01923",
                "snippet": "We propose a novel Q-learning heuristic for gate pulse synthesis reducing circuit depth by 28%.",
                "is_demo_data": True
            },
            {
                "id": "alert-item-2",
                "topic": "Multi-Agent AI Systems",
                "paper_title": "Scalable Consensus Protocols for Autonomous AI Agents",
                "authors": "Alex Thorne, Dr. Rachel Weiss",
                "published_date": "2026-10-03",
                "venue": "IEEE Computer Society",
                "snippet": "Formal proof of Byzantine Fault Tolerance in distributed LLM agent networks under high latency conditions.",
                "is_demo_data": True
            },
            {
                "id": "alert-item-3",
                "topic": "Graph-RAG Architectures",
                "paper_title": "Knowledge Graph Construction from Unstructured Medical Literature",
                "authors": "Prof. David Miller et al.",
                "published_date": "2026-10-01",
                "venue": "Bioinformatics Today",
                "snippet": "Automated entity relation extraction pipeline achieving 94.2% F1 score on PubMed Central.",
                "is_demo_data": True
            }
        ]

alert_service = PublicationAlertService()
