import os
import sys
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_spider():
    spider_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'news_spider')
    original_dir = os.getcwd()
    
    try:
        os.chdir(spider_dir)
        result = os.system(f'{sys.executable} -m scrapy crawl news_sites')
        if result == 0:
            logger.info("Spider ran successfully")
        else:
            logger.error(f"Spider failed with code: {result}")
    except Exception as e:
        logger.error(f"Error running spider: {e}")
    finally:
        os.chdir(original_dir)


def start_scheduler():
    scheduler = BackgroundScheduler()
    
    scheduler.add_job(
        run_spider,
        trigger=CronTrigger(hour=8, minute=0),
        id='daily_news_crawl',
        name='Daily news crawl at 8:00 AM',
        replace_existing=True
    )
    
    scheduler.add_job(
        run_spider,
        trigger=CronTrigger(hour=12, minute=0),
        id='daily_news_crawl_noon',
        name='Daily news crawl at 12:00 PM',
        replace_existing=True
    )
    
    scheduler.add_job(
        run_spider,
        trigger=CronTrigger(hour=18, minute=0),
        id='daily_news_crawl_evening',
        name='Daily news crawl at 6:00 PM',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler started. Daily news crawls scheduled at 8:00 AM, 12:00 PM, and 6:00 PM")
    
    return scheduler
