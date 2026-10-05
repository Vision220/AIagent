import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import ResearchProfile
from app.services.discovery_service import discovery_service

logger = logging.getLogger(__name__)

class MonitoringScheduler:
    """
    Background Monitoring Scheduler:
    - Runs periodic background checks for active research profiles based on frequency.
    - Prevents overlapping runs for the same profile using active job locks.
    - Provides manual on-demand execution.
    - Handles bounded retries (max 2 retries).
    """

    def __init__(self):
        self._is_running = False
        self._active_profile_locks: Set[int] = set()
        self._task: Optional[asyncio.Task] = None
        self._poll_interval_seconds = 60  # Check profile schedules every 60 seconds

    def is_active(self) -> bool:
        return self._is_running

    def start(self):
        """Starts the background monitoring loop task."""
        if not self._is_running:
            self._is_running = True
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    self._task = loop.create_task(self._scheduler_loop())
            except RuntimeError:
                logger.warning("No running asyncio event loop for monitoring scheduler. Manual refresh available.")

    def stop(self):
        """Stops the background monitoring loop."""
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()

    async def _scheduler_loop(self):
        """Loop that checks active profiles and executes monitoring when due."""
        logger.info("Research Monitoring Scheduler loop started.")
        while self._is_running:
            try:
                await self.check_and_run_due_profiles()
            except Exception as e:
                logger.error(f"Error in monitoring scheduler loop: {e}")
            await asyncio.sleep(self._poll_interval_seconds)

    def is_profile_due(self, profile: ResearchProfile, now: datetime) -> bool:
        """Determines if a profile is due for a scheduled run based on frequency."""
        if not profile.is_active:
            return False
        if profile.frequency == "manual":
            return False

        if not profile.last_run_at:
            return True  # Never run before -> due immediately

        last_run = profile.last_run_at
        if last_run.tzinfo is None:
            last_run = last_run.replace(tzinfo=timezone.utc)

        delta = now - last_run
        if profile.frequency == "daily" and delta >= timedelta(days=1):
            return True
        elif profile.frequency == "weekly" and delta >= timedelta(days=7):
            return True
        elif profile.frequency == "monthly" and delta >= timedelta(days=30):
            return True

        return False

    async def check_and_run_due_profiles(self):
        """Scans database for due active profiles and triggers discovery."""
        db: Session = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            profiles = db.query(ResearchProfile).filter(ResearchProfile.is_active == True).all()

            for profile in profiles:
                if profile.id in self._active_profile_locks:
                    continue  # Already running

                if self.is_profile_due(profile, now):
                    logger.info(f"Triggering scheduled monitoring for profile {profile.id} ({profile.name})")
                    await self.run_profile_job(profile.id, triggered_by="scheduled")
                    await asyncio.sleep(2.0)  # Gentle spacing between profiles
        finally:
            db.close()

    async def run_profile_job(self, profile_id: int, triggered_by: str = "manual") -> Dict[str, Any]:
        """
        Executes a monitoring job for a specific profile with lock protection
        and bounded retries (max 2 retries).
        """
        if profile_id in self._active_profile_locks:
            return {
                "success": False,
                "error": "A monitoring job is already actively running for this profile.",
                "profile_id": profile_id,
                "status": "locked"
            }

        self._active_profile_locks.add(profile_id)
        max_retries = 2
        last_result: Dict[str, Any] = {"success": False, "error": "Unknown error"}

        try:
            for attempt in range(max_retries + 1):
                db: Session = SessionLocal()
                try:
                    profile = db.query(ResearchProfile).filter(ResearchProfile.id == profile_id).first()
                    if not profile:
                        return {"success": False, "error": "Profile not found."}

                    result = await discovery_service.run_discovery_for_profile(
                        db=db,
                        profile=profile,
                        triggered_by=triggered_by
                    )
                    last_result = result
                    if result.get("success"):
                        return result
                    else:
                        logger.warning(f"Monitoring attempt {attempt + 1} failed for profile {profile_id}: {result.get('error')}")
                        if attempt < max_retries:
                            await asyncio.sleep(1.5 * (attempt + 1))
                finally:
                    db.close()
        finally:
            self._active_profile_locks.discard(profile_id)

        return last_result

monitoring_scheduler = MonitoringScheduler()
