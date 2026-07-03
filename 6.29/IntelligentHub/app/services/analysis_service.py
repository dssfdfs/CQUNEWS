from collections import Counter
from datetime import datetime, timedelta


def cluster_events(articles):
    clusters = []
    used = set()
    
    for i, article in enumerate(articles):
        if i in used:
            continue
        
        cluster = {"articles": [article], "name": article.title[:20]}
        used.add(i)
        
        for j, other in enumerate(articles):
            if j in used:
                continue
            
            title_sim = calculate_similarity(article.title, other.title)
            if title_sim > 0.3:
                cluster["articles"].append(other)
                used.add(j)
        
        clusters.append(cluster)
    
    return clusters


def calculate_similarity(text1, text2):
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    if not words1 or not words2:
        return 0
    return len(words1 & words2) / len(words1 | words2)


def analyze_hot_keywords(articles, days=7):
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    recent_articles = [a for a in articles if a.published_at and a.published_at >= cutoff_date]
    
    all_keywords = []
    for article in recent_articles:
        if article.summary:
            all_keywords.extend(article.summary.split())
        if article.title:
            all_keywords.extend(article.title.split())
    
    counter = Counter(all_keywords)
    return [{"word": w, "count": c} for w, c in counter.most_common(20)]


def generate_word_cloud_data(articles, source_filter=None):
    filtered = articles
    if source_filter:
        filtered = [a for a in articles if a.source_id == source_filter]
    
    all_text = " ".join([a.title + " " + (a.summary or "") for a in filtered])
    words = all_text.lower().split()
    counter = Counter(words)
    
    stop_words = {"的", "是", "在", "有", "和", "了", "我", "你", "他", "她", "它", "这", "那", "很", "都", "会", "可以", "能", "不", "我们", "你们", "他们", "一个", "一些", "什么", "怎么", "为什么", "因为", "所以", "但是", "如果", "虽然", "已经", "正在", "将要", "曾经", "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "or", "and", "but", "if", "because", "until", "while", "about", "against", "he", "she", "it", "they", "we", "you", "i", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their"}
    
    filtered_words = [(w, c) for w, c in counter.items() if w not in stop_words and len(w) > 1]
    return [{"word": w, "frequency": c} for w, c in sorted(filtered_words, key=lambda x: x[1], reverse=True)[:50]]


POSITIVE_WORDS = [
    "好", "优秀", "成功", "进步", "创新", "发展", "增长", "稳定", "积极", "乐观",
    "满意", "支持", "认可", "赞赏", "期待", "信心", "机遇", "前景", "利好", "上涨",
    "突破", "领先", "卓越", "高效", "可靠", "安全", "便捷", "舒适", "健康", "幸福",
    "beautiful", "excellent", "success", "good", "great", "amazing", "wonderful", "positive",
    "growth", "increase", "improve", "strong", "stable", "reliable", "confident", "happy"
]

NEGATIVE_WORDS = [
    "差", "失败", "下降", "亏损", "风险", "问题", "危机", "挑战", "负面", "悲观",
    "不满", "批评", "质疑", "担忧", "焦虑", "困境", "衰退", "下跌", "暴跌", "崩盘",
    "失误", "缺陷", "漏洞", "故障", "延误", "取消", "暂停", "关闭", "破产", "违约",
    "bad", "poor", "failure", "negative", "decline", "drop", "fall", "risk", "danger",
    "problem", "issue", "concern", "worried", "sad", "angry", "disappointed", "terrible"
]


def analyze_sentiment_distribution(articles):
    if not articles:
        return {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
    
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    
    for article in articles:
        if hasattr(article, 'sentiment_label') and article.sentiment_label:
            label = article.sentiment_label
        else:
            content = article.content or article.summary or ""
            label = _analyze_text_sentiment(content)
        
        if label in counts:
            counts[label] += 1
    
    counts["total"] = len(articles)
    
    return counts


def _analyze_text_sentiment(content):
    words = content.lower().split()
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"


def analyze_word_sentiment(articles, keyword=None):
    if not articles:
        return {"keyword": keyword, "sentiment_score": 0.0, "sentiment_label": "neutral", "count": 0}
    
    filtered_articles = articles
    if keyword:
        filtered_articles = [a for a in articles if keyword.lower() in (a.title or "").lower() or keyword.lower() in (a.content or "").lower()]
    
    if not filtered_articles:
        return {"keyword": keyword, "sentiment_score": 0.0, "sentiment_label": "neutral", "count": 0}
    
    total_score = 0.0
    count = 0
    
    for article in filtered_articles:
        if hasattr(article, 'sentiment_score'):
            total_score += article.sentiment_score
            count += 1
        else:
            content = article.content or article.summary or ""
            score = _calculate_sentiment_score(content)
            total_score += score
            count += 1
    
    avg_score = round(total_score / count, 2) if count > 0 else 0.0
    
    if avg_score > 0.2:
        label = "positive"
    elif avg_score < -0.2:
        label = "negative"
    else:
        label = "neutral"
    
    return {
        "keyword": keyword,
        "sentiment_score": avg_score,
        "sentiment_label": label,
        "count": len(filtered_articles),
        "articles_analyzed": count
    }


def _calculate_sentiment_score(content):
    words = content.lower().split()
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    total = positive_count + negative_count
    
    if total == 0:
        return 0.0
    return round((positive_count - negative_count) / total, 2)