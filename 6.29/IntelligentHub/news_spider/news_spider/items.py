import scrapy
from datetime import datetime


class NewsArticleItem(scrapy.Item):
    url = scrapy.Field()
    title = scrapy.Field()
    content = scrapy.Field()
    summary = scrapy.Field()
    source_name = scrapy.Field()
    published_at = scrapy.Field()
    url_hash = scrapy.Field()
