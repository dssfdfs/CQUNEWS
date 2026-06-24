import random
import re
from collections import Counter

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


def generate_summary(content: str, max_length: int = 200) -> str:
    sentences = content.split("\n")
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return ""
    selected = sentences[:3]
    summary = " ".join(selected)
    if len(summary) > max_length:
        summary = summary[:max_length] + "..."
    return summary


def generate_summary_with_style(content: str, title: str = None, length: str = "medium", style: str = "neutral") -> dict:
    sentences = content.split("\n")
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return {"short": "", "medium": "", "long": ""}

    short_length = 50
    medium_length = 150
    long_length = 300

    summary_short = _generate_formatted_summary(sentences, short_length, style)
    summary_medium = _generate_formatted_summary(sentences, medium_length, style)
    summary_long = _generate_formatted_summary(sentences, long_length, style)

    return {
        "short": summary_short,
        "medium": summary_medium,
        "long": summary_long
    }


def _generate_formatted_summary(sentences, max_length, style):
    if not sentences:
        return ""

    if style == "formal":
        prefix = "本文旨在阐述" if len(sentences) > 1 else "该文指出"
        suffix = "。综上所述，上述内容具有重要的参考价值。"
    elif style == "concise":
        prefix = ""
        suffix = ""
    elif style == "vivid":
        prefix = "哇！" if sentences else ""
        suffix = "，真是令人印象深刻！"
    elif style == "analytical":
        prefix = "经过深入分析，"
        suffix = "。这一发现值得进一步研究探讨。"
    else:
        prefix = ""
        suffix = ""

    summary = " ".join(sentences)
    
    remaining_length = max_length - len(prefix) - len(suffix)
    if remaining_length <= 0:
        remaining_length = max_length
    
    if len(summary) > remaining_length:
        summary = summary[:remaining_length].rsplit(' ', 1)[0] + "..."
    
    return prefix + summary + suffix


def extract_keywords(content: str, max_keywords: int = 10) -> list:
    words = content.lower().split()
    stop_words = ["的", "是", "在", "有", "和", "了", "我", "你", "他", "她", "它", "这", "那", "很", "都", "会", "可以", "能", "不", "我们", "你们", "他们", "一个", "一些", "什么", "怎么", "为什么", "因为", "所以", "但是", "如果", "虽然", "已经", "正在", "将要", "曾经", "will", "would", "could", "should", "may", "might", "must", "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "or", "and", "but", "if", "because", "until", "while", "about", "against", "he", "she", "it", "they", "we", "you", "i", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their"]
    filtered = [w for w in words if w.isalnum() and len(w) > 1 and w not in stop_words]
    counter = Counter(filtered)
    return [w for w, _ in counter.most_common(max_keywords)]


def extract_entities(content: str) -> list:
    company_pattern = re.compile(r"([\u4e00-\u9fa5]{2,8})(公司|集团|股份|科技|有限|控股)")
    person_pattern = re.compile(r"([\u4e00-\u9fa5]{2,4})(先生|女士|博士|教授|经理)")
    companies = company_pattern.findall(content)
    persons = person_pattern.findall(content)
    entities = []
    for name, suffix in companies:
        entities.append({"name": name + suffix, "type": "company"})
    for name, suffix in persons:
        entities.append({"name": name + suffix, "type": "person"})
    return entities[:5]


def calculate_score(content: str) -> float:
    base_score = 0.5
    length_factor = min(len(content) / 1000, 1) * 0.3
    keyword_factor = min(len(extract_keywords(content)) / 10, 1) * 0.2
    return round(base_score + length_factor + keyword_factor + random.uniform(-0.1, 0.1), 2)


def check_consistency(title: str, content: str) -> bool:
    title_lower = title.lower()
    content_lower = content.lower()
    
    title_chars = set(title_lower)
    content_chars = set(content_lower)
    char_overlap = title_chars.intersection(content_chars)
    
    if len(char_overlap) >= 5:
        return True
    
    title_words = title_lower.split()
    word_matches = sum(1 for word in title_words if len(word) > 1 and word in content_lower)
    
    if word_matches >= 2:
        return True
    
    for char in title_lower:
        if char.isalnum() and char in content_lower:
            return True
    
    return False


def analyze_sentiment(content: str) -> dict:
    words = content.lower().split()
    
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    
    positive_words_found = [word for word in words if word in POSITIVE_WORDS][:10]
    negative_words_found = [word for word in words if word in NEGATIVE_WORDS][:10]
    
    total_count = positive_count + negative_count
    
    if total_count == 0:
        sentiment_score = 0.0
        sentiment_label = "neutral"
    else:
        sentiment_score = (positive_count - negative_count) / total_count
        sentiment_score = round(sentiment_score, 2)
        
        if sentiment_score > 0.2:
            sentiment_label = "positive"
        elif sentiment_score < -0.2:
            sentiment_label = "negative"
        else:
            sentiment_label = "neutral"
    
    return {
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "positive_words": positive_words_found,
        "negative_words": negative_words_found
    }


def generate_title(content: str, style: str = "neutral") -> str:
    sentences = content.split("\n")
    sentences = [s.strip() for s in sentences if s.strip() and len(s) > 10]
    
    if not sentences:
        return "未命名文章"
    
    keywords = extract_keywords(content, max_keywords=5)
    
    if len(sentences) >= 1:
        first_sentence = sentences[0]
        if len(first_sentence) <= 30:
            base_title = first_sentence
        else:
            base_title = first_sentence[:27] + "..."
    else:
        base_title = "文章摘要"
    
    if keywords:
        keyword_str = "、".join(keywords[:3])
        if style == "formal":
            title = f"关于{keyword_str}的研究报告"
        elif style == "vivid":
            title = f"震惊！{keywords[0]}背后隐藏的秘密"
        elif style == "question":
            title = f"{keywords[0]}？一文读懂核心要点"
        else:
            title = base_title if base_title != "文章摘要" else f"聚焦{keywords[0]}：深度解读"
    else:
        title = base_title
    
    if len(title) > 50:
        title = title[:47] + "..."
    
    return title