import hashlib
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.news_article import NewsArticle
from app.models.news_source import NewsSource
from datetime import datetime


class NewsSpiderPipeline:
    def __init__(self):
        self.db = SessionLocal()

    def close_spider(self, spider):
        self.db.close()

    def get_or_create_source(self, source_name, url):
        source = self.db.query(NewsSource).filter(NewsSource.name == source_name).first()
        if not source:
            source = NewsSource(name=source_name, url=url)
            self.db.add(source)
            self.db.commit()
            self.db.refresh(source)
        return source

    def process_item(self, item, spider):
        url_hash = hashlib.md5(item['url'].encode()).hexdigest()
        
        existing_article = self.db.query(NewsArticle).filter(NewsArticle.url_hash == url_hash).first()
        if existing_article:
            spider.logger.info(f"Article already exists: {item['url']}")
            return item

        source = self.get_or_create_source(item['source_name'], spider.allowed_domains[0] if spider.allowed_domains else '')

        try:
            published_at = item['published_at']
            if isinstance(published_at, str):
                published_at = self.parse_datetime(published_at)
        except:
            published_at = datetime.now()

        article = NewsArticle(
            url=item['url'],
            url_hash=url_hash,
            title=item['title'],
            content=item['content'][:5000] if item['content'] else '',
            summary=item['summary'][:500] if item['summary'] else '',
            source_id=source.id,
            published_at=published_at,
            kept=True,
            score=0.0
        )
        
        self.db.add(article)
        self.db.commit()
        self.db.refresh(article)
        
        spider.logger.info(f"Saved article: {item['title']}")
        return item

    def parse_datetime(self, date_str):
        date_formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y年%m月%d日 %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y年%m月%d日 %H:%M',
            '%Y-%m-%d',
            '%Y年%m月%d日',
        ]
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except:
                continue
        return datetime.now()
