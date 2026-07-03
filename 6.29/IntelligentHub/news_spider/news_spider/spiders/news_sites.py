import scrapy
from news_spider.items import NewsArticleItem
from datetime import datetime
import re


class NewsSiteSpider(scrapy.Spider):
    name = 'news_sites'
    
    start_urls = [
        'https://news.sina.com.cn/',
        'https://news.qq.com/',
        'https://www.sohu.com/',
        'https://www.163.com/',
        'https://news.cn/',
    ]
    
    allowed_domains = ['news.sina.com.cn', 'news.qq.com', 'www.sohu.com', 'www.163.com', 'news.cn']

    def parse(self, response):
        if 'news.sina.com.cn' in response.url:
            yield from self.parse_sina(response)
        elif 'news.qq.com' in response.url:
            yield from self.parse_qq(response)
        elif 'sohu.com' in response.url:
            yield from self.parse_sohu(response)
        elif '163.com' in response.url:
            yield from self.parse_163(response)
        elif 'news.cn' in response.url:
            yield from self.parse_xinhua(response)

    def parse_sina(self, response):
        articles = response.xpath('//a[@class="news-title" or @class="link"]')
        for article in articles[:10]:
            title = article.xpath('.//text()').get()
            url = article.xpath('.//@href').get()
            if title and url and url.startswith('http'):
                yield scrapy.Request(url, callback=self.parse_sina_article, meta={'title': title})

    def parse_sina_article(self, response):
        title = response.meta.get('title', '')
        content = '\n'.join(response.xpath('//div[@class="article-content"]//p//text()').getall())
        summary = response.xpath('//meta[@name="description"]/@content').get() or ''
        date_str = response.xpath('//span[@class="date"]//text()').get() or ''
        
        item = NewsArticleItem()
        item['url'] = response.url
        item['title'] = title
        item['content'] = content
        item['summary'] = summary
        item['source_name'] = '新浪新闻'
        item['published_at'] = self._parse_date(date_str)
        yield item

    def parse_qq(self, response):
        articles = response.xpath('//a[@class="link" or @class="title-link"]')
        for article in articles[:10]:
            title = article.xpath('.//text()').get()
            url = article.xpath('.//@href').get()
            if title and url and url.startswith('http'):
                yield scrapy.Request(url, callback=self.parse_qq_article, meta={'title': title})

    def parse_qq_article(self, response):
        title = response.meta.get('title', '') or response.xpath('//h1//text()').get() or ''
        content = '\n'.join(response.xpath('//div[@class="content-article"]//p//text()').getall())
        summary = response.xpath('//meta[@name="description"]/@content').get() or ''
        date_str = response.xpath('//span[@class="article-time"]//text()').get() or ''
        
        item = NewsArticleItem()
        item['url'] = response.url
        item['title'] = title
        item['content'] = content
        item['summary'] = summary
        item['source_name'] = '腾讯新闻'
        item['published_at'] = self._parse_date(date_str)
        yield item

    def parse_sohu(self, response):
        articles = response.xpath('//a[@class="news-title" or contains(@class, "title")]')
        for article in articles[:10]:
            title = article.xpath('.//text()').get()
            url = article.xpath('.//@href').get()
            if title and url and url.startswith('http'):
                yield scrapy.Request(url, callback=self.parse_sohu_article, meta={'title': title})

    def parse_sohu_article(self, response):
        title = response.meta.get('title', '') or response.xpath('//h1//text()').get() or ''
        content = '\n'.join(response.xpath('//article//p//text()').getall())
        summary = response.xpath('//meta[@name="description"]/@content').get() or ''
        date_str = response.xpath('//span[@class="time"]//text()').get() or ''
        
        item = NewsArticleItem()
        item['url'] = response.url
        item['title'] = title
        item['content'] = content
        item['summary'] = summary
        item['source_name'] = '搜狐新闻'
        item['published_at'] = self._parse_date(date_str)
        yield item

    def parse_163(self, response):
        articles = response.xpath('//a[@class="title" or contains(@class, "news-title")]')
        for article in articles[:10]:
            title = article.xpath('.//text()').get()
            url = article.xpath('.//@href').get()
            if title and url and url.startswith('http'):
                yield scrapy.Request(url, callback=self.parse_163_article, meta={'title': title})

    def parse_163_article(self, response):
        title = response.meta.get('title', '') or response.xpath('//h1//text()').get() or ''
        content = '\n'.join(response.xpath('//div[@id="content"]//p//text()').getall())
        summary = response.xpath('//meta[@name="description"]/@content').get() or ''
        date_str = response.xpath('//span[@class="post-time"]//text()').get() or ''
        
        item = NewsArticleItem()
        item['url'] = response.url
        item['title'] = title
        item['content'] = content
        item['summary'] = summary
        item['source_name'] = '网易新闻'
        item['published_at'] = self._parse_date(date_str)
        yield item

    def parse_xinhua(self, response):
        articles = response.xpath('//a[@class="title" or contains(@class, "link")]')
        for article in articles[:10]:
            title = article.xpath('.//text()').get()
            url = article.xpath('.//@href').get()
            if title and url and url.startswith('http'):
                yield scrapy.Request(url, callback=self.parse_xinhua_article, meta={'title': title})

    def parse_xinhua_article(self, response):
        title = response.meta.get('title', '') or response.xpath('//h1//text()').get() or ''
        content = '\n'.join(response.xpath('//div[@class="article" or @id="article"]//p//text()').getall())
        summary = response.xpath('//meta[@name="description"]/@content').get() or ''
        date_str = response.xpath('//span[@class="time" or @class="pubtime"]//text()').get() or ''
        
        item = NewsArticleItem()
        item['url'] = response.url
        item['title'] = title
        item['content'] = content
        item['summary'] = summary
        item['source_name'] = '新华网'
        item['published_at'] = self._parse_date(date_str)
        yield item

    def _parse_date(self, date_str):
        if not date_str:
            return datetime.now()
        
        patterns = [
            r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?',
            r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                groups = match.groups()
                year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                hour, minute, second = int(groups[3]) if len(groups) > 3 else 0, int(groups[4]) if len(groups) > 4 else 0, int(groups[5]) if len(groups) > 5 else 0
                return datetime(year, month, day, hour, minute, second)
        
        return datetime.now()
