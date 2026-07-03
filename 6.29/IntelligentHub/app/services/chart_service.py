from datetime import datetime, timedelta
from collections import Counter
from app.models.news_article import NewsArticle


def get_daily_article_count(articles):
    if not articles:
        return {"dates": [], "counts": []}
    
    date_counts = Counter()
    for article in articles:
        if article.published_at:
            date_str = article.published_at.strftime('%Y-%m-%d')
        elif article.created_at:
            date_str = article.created_at.strftime('%Y-%m-%d')
        else:
            continue
        date_counts[date_str] += 1
    
    sorted_dates = sorted(date_counts.keys())
    return {
        "dates": sorted_dates,
        "counts": [date_counts[d] for d in sorted_dates]
    }


def get_source_distribution(articles):
    if not articles:
        return {"sources": [], "counts": []}
    
    source_counts = Counter()
    for article in articles:
        source_name = str(article.source_id) if article.source_id else "未知"
        source_counts[source_name] += 1
    
    return {
        "sources": list(source_counts.keys()),
        "counts": list(source_counts.values())
    }


def get_sentiment_trend(articles, days=7):
    if not articles:
        return {"dates": [], "positive": [], "negative": [], "neutral": []}
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    def get_article_date(article):
        return article.published_at if article.published_at else article.created_at
    
    recent_articles = [a for a in articles if get_article_date(a) and get_article_date(a) >= cutoff_date]
    
    date_sentiment = {}
    for article in recent_articles:
        date_str = get_article_date(article).strftime('%Y-%m-%d')
        if date_str not in date_sentiment:
            date_sentiment[date_str] = {"positive": 0, "negative": 0, "neutral": 0}
        
        if article.sentiment_label:
            label = article.sentiment_label
        else:
            content = article.content or article.summary or ""
            label = _simple_sentiment(content)
        
        if label in date_sentiment[date_str]:
            date_sentiment[date_str][label] += 1
    
    sorted_dates = sorted(date_sentiment.keys())
    return {
        "dates": sorted_dates,
        "positive": [date_sentiment[d]["positive"] for d in sorted_dates],
        "negative": [date_sentiment[d]["negative"] for d in sorted_dates],
        "neutral": [date_sentiment[d]["neutral"] for d in sorted_dates]
    }


def get_keyword_trend(articles, keyword, days=7):
    if not articles or not keyword:
        return {"dates": [], "counts": []}
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    def get_article_date(article):
        return article.published_at if article.published_at else article.created_at
    
    recent_articles = [a for a in articles if get_article_date(a) and get_article_date(a) >= cutoff_date]
    
    date_counts = Counter()
    for article in recent_articles:
        text = f"{article.title} {article.summary}"
        if keyword.lower() in text.lower():
            date_str = get_article_date(article).strftime('%Y-%m-%d')
            date_counts[date_str] += 1
    
    sorted_dates = sorted(date_counts.keys())
    return {
        "dates": sorted_dates,
        "counts": [date_counts[d] for d in sorted_dates],
        "keyword": keyword
    }


def _simple_sentiment(content):
    positive_words = {"好", "优秀", "成功", "进步", "创新", "发展", "增长", "稳定", "积极", "乐观", "满意", "支持", "认可", "赞赏"}
    negative_words = {"差", "失败", "下降", "亏损", "风险", "问题", "危机", "挑战", "负面", "悲观", "不满", "批评", "质疑", "担忧"}
    
    words = content.lower().split()
    positive_count = sum(1 for word in words if word in positive_words)
    negative_count = sum(1 for word in words if word in negative_words)
    
    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"


def get_top_keywords(articles, limit=10):
    if not articles:
        return {"keywords": [], "counts": []}
    
    all_text = ""
    for article in articles:
        all_text += f"{article.title} {article.summary} "
    
    words = all_text.lower().split()
    stop_words = {"的", "是", "在", "有", "和", "了", "我", "你", "他", "她", "它", "这", "那", "很", "都", "会", "可以", "能", "不", "我们", "你们", "他们", "一个", "一些", "什么", "怎么", "为什么", "因为", "所以", "但是", "如果", "虽然", "已经", "正在", "将要", "曾经"}
    
    filtered = [w for w in words if w not in stop_words and len(w) > 1]
    counter = Counter(filtered)
    
    top = counter.most_common(limit)
    return {
        "keywords": [w for w, c in top],
        "counts": [c for w, c in top]
    }
