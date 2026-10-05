from typing import List, Dict, Any

class NotificationService:
    def get_user_notifications(self, user_id: int) -> List[Dict[str, Any]]:
        return [
            {
                "id": "notif-1",
                "type": "publication_alert",
                "title": "New Paper Alert: Quantum Machine Learning",
                "message": "2 new preprints matched your research subscription query.",
                "created_at": "2026-10-05T06:30:00Z",
                "read": False
            },
            {
                "id": "notif-2",
                "type": "research_completed",
                "title": "Deep Research Finished",
                "message": "Your synthesis report on 'Multi-Agent Autonomous Systems' is ready.",
                "created_at": "2026-10-04T18:15:00Z",
                "read": True
            }
        ]

notification_service = NotificationService()
