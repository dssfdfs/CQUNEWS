from __future__ import annotations

from datetime import datetime
from threading import Lock

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .config import settings
from .crawler import run_crawl
from .logger import logger

_scheduler: BackgroundScheduler | None = None
_lock = Lock()
_job_running = False


def _job() -> None:
    global _job_running
    with _lock:
        if _job_running:
            logger.info("Crawl job skipped because previous run is still active.")
            return
        _job_running = True
    try:
        logger.info("Scheduled crawl task triggered at %s", datetime.now().isoformat())
        run_crawl()
    except Exception as e:  # noqa: BLE001
        logger.error("Scheduled crawl failed: %s", e)
    finally:
        with _lock:
            _job_running = False


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
    _scheduler.add_job(
        _job,
        trigger=IntervalTrigger(minutes=settings.CRAWL_INTERVAL_MINUTES),
        id="news_crawler_interval",
        name="Periodic news crawl",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "APScheduler started, crawl interval = %d minutes", settings.CRAWL_INTERVAL_MINUTES
    )
    return _scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
    _scheduler = None


def trigger_crawl_now() -> None:
    _job()
