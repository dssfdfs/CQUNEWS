BOT_NAME = 'news_spider'

SPIDER_MODULES = ['news_spider.spiders']
NEWSPIDER_MODULE = 'news_spider.spiders'

ROBOTSTXT_OBEY = False

DOWNLOAD_DELAY = 2

CONCURRENT_REQUESTS = 4

DEFAULT_REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

ITEM_PIPELINES = {
    'news_spider.pipelines.NewsSpiderPipeline': 300,
}

LOG_LEVEL = 'INFO'

DOWNLOAD_TIMEOUT = 30
