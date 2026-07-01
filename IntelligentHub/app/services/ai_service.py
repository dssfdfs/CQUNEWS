import random
import re
import os
from collections import Counter

# 尝试导入transformers，如果不可用则使用规则方法
try:
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

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

EMOTION_WORDS = {
    "happy": ["高兴", "快乐", "开心", "喜悦", "兴奋", "惊喜", "满意", "欣慰", "庆祝", "祝贺",
              "happy", "joy", "joyful", "excited", "delighted", "pleased", "celebrate"],
    "sad": ["悲伤", "难过", "伤心", "失望", "沮丧", "痛苦", "悲痛", "哀伤", "遗憾", "惋惜",
            "sad", "sorrow", "grief", "disappointed", "depressed", "heartbroken"],
    "angry": ["愤怒", "生气", "不满", "愤慨", "暴怒", "恼火", "谴责", "批评", "指责", "抱怨",
              "angry", "furious", "outraged", "annoyed", "frustrated", "indignant"],
    "worried": ["担忧", "担心", "忧虑", "焦虑", "不安", "恐慌", "紧张", "害怕", "恐惧", "顾虑",
                "worried", "anxious", "concerned", "fearful", "nervous", "uneasy"],
    "surprised": ["惊讶", "震惊", "意外", "诧异", "愕然", "意外", "出乎意料", "意想不到",
                  "surprised", "shocked", "astonished", "amazed", "unexpected"],
    "confident": ["信心", "自信", "乐观", "看好", "坚信", "确信", "肯定", "有把握", "充满信心",
                  "confident", "optimistic", "sure", "certain", "hopeful", "positive"],
    "skeptical": ["怀疑", "质疑", "不信任", "存疑", "疑虑", "困惑", "不解", "质疑", "挑战",
                  "skeptical", "doubtful", "questioning", "uncertain", "suspicious"],
    "neutral": ["客观", "中立", "事实", "报道", "消息", "称", "表示", "认为", "指出", "分析"]
}

CATEGORY_KEYWORDS = {
    "财经": ["股票", "股价", "涨", "跌", "投资", "基金", "银行", "金融", "经济", "市场",
            "公司", "企业", "利润", "收入", "财报", "上市", "IPO", "融资", "并购",
            "money", "stock", "finance", "investment", "market", "economy", "bank", "company"],
    "体育": ["比赛", "足球", "篮球", "球队", "球员", "冠军", "胜利", "输", "赢", "比分",
            "联赛", "世界杯", "奥运会", "进球", "得分", "教练", "训练", "体育",
            "sports", "football", "basketball", "match", "game", "team", "player", "champion"],
    "科技": ["技术", "科技", "互联网", "人工智能", "AI", "芯片", "手机", "电脑", "软件", "硬件",
            "数据", "算法", "机器人", "自动化", "创新", "研发", "科技公司", "技术突破",
            "technology", "tech", "internet", "ai", "artificial", "intelligence", "software", "hardware"],
    "政治": ["政府", "政策", "官员", "部长", "总理", "总统", "选举", "议会", "法案", "法律",
            "外交", "国际关系", "政策", "改革", "会议", "讲话", "声明", "公告",
            "politics", "government", "policy", "official", "election", "law", "diplomacy", "minister"],
    "娱乐": ["电影", "明星", "演员", "歌手", "音乐", "演唱会", "节目", "综艺", "电视剧", "网剧",
            "票房", "获奖", "绯闻", "八卦", "红毯", "首映", "发布会", "娱乐新闻",
            "entertainment", "movie", "star", "actor", "music", "concert", "show", "celebrity"],
    "健康": ["健康", "医疗", "医院", "医生", "疾病", "治疗", "疫苗", "药物", "体检", "养生",
            "疫情", "病毒", "感染", "症状", "康复", "急救", "保健", "心理健康",
            "health", "medical", "hospital", "doctor", "disease", "treatment", "medicine", "healthcare"],
    "教育": ["学校", "学生", "老师", "考试", "高考", "考研", "教育", "培训", "课程", "学习",
            "学校", "大学", "学院", "招生", "毕业", "就业", "学术", "研究", "论文",
            "education", "school", "student", "teacher", "exam", "study", "learn", "university"],
    "社会": ["社会", "事件", "事故", "救援", "民生", "就业", "物价", "交通", "环境", "安全",
            "社区", "公益", "志愿者", "慈善", "救助", "争议", "事件", "热点",
            "society", "social", "community", "accident", "event", "public", "people", "life"],
    "军事": ["军事", "军队", "国防", "武器", "演习", "战争", "冲突", "安全", "战略", "部署",
            "军队", "士兵", "将军", "装备", "导弹", "航母", "战机", "国防预算",
            "military", "army", "defense", "weapon", "war", "strategy", "security", "soldier"],
    "国际": ["国际", "全球", "世界", "各国", "海外", "外交", "贸易", "合作", "峰会", "组织",
            "国际", "全球", "世界", "各国", "海外", "外交", "贸易", "合作", "峰会",
            "international", "global", "world", "foreign", "diplomacy", "trade", "cooperation"]
}

CHINESE_STOP_WORDS = ["的", "是", "在", "有", "和", "了", "我", "你", "他", "她", "它", 
                      "这", "那", "很", "都", "会", "可以", "能", "不", "我们", "你们", 
                      "他们", "一个", "一些", "什么", "怎么", "为什么", "因为", "所以", 
                      "但是", "如果", "虽然", "已经", "正在", "将要", "曾经", "就", "也", 
                      "又", "再", "还", "更", "最", "太", "非常", "特别", "十分", "很",
                      "及", "与", "等", "等等", "即", "也就是", "例如", "比如", "包括"]

ENGLISH_STOP_WORDS = ["will", "would", "could", "should", "may", "might", "must", "a", 
                      "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", 
                      "from", "as", "into", "through", "during", "before", "after", 
                      "above", "below", "between", "under", "again", "further", "then", 
                      "once", "here", "there", "when", "where", "why", "how", "all", 
                      "each", "few", "more", "most", "other", "some", "such", "no", 
                      "nor", "not", "only", "own", "same", "so", "than", "too", "very", 
                      "just", "or", "and", "but", "if", "because", "until", "while", 
                      "about", "against", "he", "she", "it", "they", "we", "you", "i", 
                      "me", "him", "her", "us", "them", "my", "your", "his", "its", 
                      "our", "their"]


def _split_sentences(content: str) -> list:
    sentences = re.split(r'[。！？.!?]+', content)
    sentences = [s.strip() for s in sentences if s.strip() and len(s) >= 5]
    return sentences


def _get_keywords(content: str, max_keywords: int = 20) -> list:
    text = re.sub(r'[^\w\s\u4e00-\u9fa5]', ' ', content)
    words = re.findall(r'[\u4e00-\u9fa5]{2,}|[a-zA-Z]+', text.lower())
    stop_words = set(CHINESE_STOP_WORDS + ENGLISH_STOP_WORDS)
    filtered = [w for w in words if w not in stop_words and len(w) > 1]
    counter = Counter(filtered)
    return [w for w, _ in counter.most_common(max_keywords)]


def _score_sentence(sentence: str, keywords: list, position: int, total_sentences: int, content: str = "") -> float:
    score = 0.0
    
    sentence_lower = sentence.lower()
    keyword_count = sum(1 for kw in keywords if kw in sentence_lower)
    if keyword_count > 0:
        score += keyword_count * 2
    
    length = len(sentence)
    if 20 <= length <= 200:
        score += 1.5
    elif length > 200:
        score += 0.5
    
    position_weight = 1.0 - (position / total_sentences)
    score += position_weight * 3
    
    if re.search(r'[0-9]+', sentence):
        score += 0.5
    
    if re.search(r'(据悉|报道称|据了解|消息人士表示|专家指出)', sentence):
        score += 1
    
    if re.search(r'(决定|宣布|批准|同意|任命|表示|指出|强调|提出)', sentence):
        score += 1.5
    
    # 实体信息丰富度（包含具体数据）
    entity_pattern = re.compile(r'[\u4e00-\u9fa5]{2,5}(省|市|县|区|人|名|年|月|日|亿|万|元|美元|%)')
    if entity_pattern.search(sentence):
        score += 1
    
    return score


def _ensure_ending_punctuation(text: str) -> str:
    if not text:
        return text
    last_char = text[-1]
    if last_char in ["。", "！", "？", ".", "!", "?", "\"", "'"]:
        return text
    return text + "。"


def generate_summary(content: str, max_length: int = 200) -> str:
    sentences = _split_sentences(content)
    if not sentences:
        return ""
    
    keywords = _get_keywords(content)
    scored_sentences = []
    
    for i, sentence in enumerate(sentences):
        score = _score_sentence(sentence, keywords, i, len(sentences), content)
        scored_sentences.append((score, sentence))
    
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    
    summary = ""
    for score, sentence in scored_sentences:
        if len(summary) + len(sentence) + 1 <= max_length:
            if summary:
                summary += "。" + sentence
            else:
                summary = sentence
        else:
            break
    
    if not summary and sentences:
        summary = sentences[0][:max_length]
    
    if len(summary) > max_length:
        summary = summary[:max_length] + "..."
    
    return _ensure_ending_punctuation(summary)


def generate_summary_with_style(content: str, title: str = None, length: str = "medium", style: str = "neutral", use_t5: bool = True) -> dict:
    """生成摘要 - 优先使用T5模型，失败则使用规则方法"""
    # 优先尝试使用T5模型
    if use_t5 and TRANSFORMERS_AVAILABLE:
        try:
            return generate_summary_with_t5(content, length, style)
        except Exception as e:
            print(f"T5模型生成失败，回退到规则方法: {e}")
    
    # 回退到规则方法
    sentences = _split_sentences(content)
    if not sentences:
        return {"short": "", "medium": "", "long": ""}
    
    keywords = _get_keywords(content)
    scored_sentences = []
    
    for i, sentence in enumerate(sentences):
        score = _score_sentence(sentence, keywords, i, len(sentences), content)
        scored_sentences.append((score, sentence))
    
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    
    lengths = {
        "short": 80,
        "medium": 180,
        "long": 350
    }
    
    style_templates = {
        "formal": {
            "prefix": "本文主要内容如下：",
            "suffix": "。以上为核心要点综述。"
        },
        "concise": {
            "prefix": "",
            "suffix": ""
        },
        "vivid": {
            "prefix": "",
            "suffix": "！"
        },
        "analytical": {
            "prefix": "分析认为：",
            "suffix": "。这一情况值得关注。"
        },
        "neutral": {
            "prefix": "",
            "suffix": ""
        }
    }
    
    result = {}
    template = style_templates.get(style, style_templates["neutral"])
    
    for length_key, max_len in lengths.items():
        summary = ""
        remaining_len = max_len - len(template["prefix"]) - len(template["suffix"])
        
        for score, sentence in scored_sentences:
            if len(summary) + len(sentence) <= remaining_len:
                if summary:
                    summary += "。" + sentence
                else:
                    summary = sentence
            else:
                break
        
        if not summary and sentences:
            summary = sentences[0][:remaining_len]
        
        if len(summary) > remaining_len:
            summary = summary[:remaining_len]
        
        result[length_key] = _ensure_ending_punctuation(template["prefix"] + summary + template["suffix"])
    
    return result


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
    content_lower = content.lower()
    words = content_lower.split()
    
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
    
    emotion_scores = {}
    for emotion, keywords in EMOTION_WORDS.items():
        count = sum(1 for kw in keywords if kw in content_lower)
        emotion_scores[emotion] = count
    
    max_emotion = max(emotion_scores, key=emotion_scores.get)
    max_emotion_score = emotion_scores[max_emotion]
    
    emotion_label = max_emotion if max_emotion_score > 0 else "neutral"
    emotion_label_cn = {
        "happy": "高兴",
        "sad": "悲伤",
        "angry": "愤怒",
        "worried": "担忧",
        "surprised": "惊讶",
        "confident": "自信",
        "skeptical": "怀疑",
        "neutral": "中立"
    }.get(emotion_label, "中立")
    
    return {
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "emotion_label": emotion_label,
        "emotion_label_cn": emotion_label_cn,
        "emotion_scores": emotion_scores,
        "positive_words": positive_words_found,
        "negative_words": negative_words_found
    }


def classify_news(content: str, title: str = None) -> dict:
    content_lower = content.lower()
    if title:
        content_lower += " " + title.lower()
    
    category_scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        count = sum(1 for kw in keywords if kw in content_lower)
        category_scores[category] = count
    
    max_category = max(category_scores, key=category_scores.get)
    max_score = category_scores[max_category]
    
    if max_score == 0:
        primary_category = "其他"
        confidence = 0.0
    else:
        primary_category = max_category
        confidence = round(max_score / sum(category_scores.values()), 2) if sum(category_scores.values()) > 0 else 0.0
    
    sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
    top_categories = [cat for cat, score in sorted_categories if score > 0][:3]
    
    return {
        "primary_category": primary_category,
        "confidence": confidence,
        "category_scores": category_scores,
        "top_categories": top_categories
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


# 模型全局变量
_t5_model = None
_t5_tokenizer = None
_model_loaded = False
_model_loading = False


def _get_model_path():
    """获取模型路径"""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    local_path = os.path.join(base_dir, "models", "randeng_t5")
    
    # 检查本地模型是否存在
    required_files = ["config.json", "tokenizer_config.json"]
    if os.path.exists(local_path):
        for f in required_files:
            if os.path.exists(os.path.join(local_path, f)):
                return local_path
    
    return "IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese"


def _check_model_files():
    """检查模型文件是否完整"""
    model_path = _get_model_path()
    if not os.path.exists(model_path):
        return False, "模型目录不存在"
    
    required_files = ["config.json", "tokenizer_config.json", "special_tokens_map.json"]
    missing = []
    for f in required_files:
        if not os.path.exists(os.path.join(model_path, f)):
            missing.append(f)
    
    # 检查模型权重文件
    has_safetensors = os.path.exists(os.path.join(model_path, "model.safetensors"))
    has_pytorch = os.path.exists(os.path.join(model_path, "pytorch_model.bin"))
    if not has_safetensors and not has_pytorch:
        missing.append("model.safetensors 或 pytorch_model.bin")
    
    if missing:
        return False, f"缺少文件: {missing}"
    
    return True, "模型文件完整"


def _load_t5_model():
    """加载T5模型"""
    global _t5_model, _t5_tokenizer, _model_loaded, _model_loading
    
    if _model_loaded or _model_loading:
        return
    
    _model_loading = True
    try:
        if TRANSFORMERS_AVAILABLE:
            # 先检查模型文件
            files_ok, msg = _check_model_files()
            if not files_ok:
                print(f"模型文件不完整: {msg}")
                print("请从 https://hf-mirror.com/IDEA-CCNL/Randeng-T5-784M-MultiTask-Chinese 下载模型")
                _model_loaded = False
                return
            
            model_path = _get_model_path()
            print(f"正在加载本地模型: {model_path}")
            
            # 使用 local_files_only=True 强制只加载本地文件
            _t5_tokenizer = AutoTokenizer.from_pretrained(
                model_path,
                local_files_only=True
            )
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"使用设备: {device}")
            
            _t5_model = AutoModelForSeq2SeqLM.from_pretrained(
                model_path,
                local_files_only=True,
                low_cpu_mem_usage=True
            )
            
            _model_loaded = True
            print("✅ 模型加载成功!")
        else:
            print("transformers库未安装，使用规则方法生成摘要")
    except Exception as e:
        print(f"模型加载失败: {e}")
        print("将使用规则方法生成摘要")
        _model_loaded = False
    finally:
        _model_loading = False


def generate_summary_with_t5(content: str, length: str = "medium", style: str = "neutral") -> dict:
    """使用T5模型生成摘要"""
    global _model_loaded
    
    if not _model_loaded and TRANSFORMERS_AVAILABLE:
        _load_t5_model()
    
    if not _model_loaded or _t5_model is None:
        return generate_summary_with_style(content, length=length, style=style)
    
    # 根据长度选择max_length
    max_lengths = {"short": 50, "medium": 100, "long": 200}
    max_length = max_lengths.get(length, 100)
    
    # Randeng-T5 摘要任务格式
    input_text = content[:1500]
    
    try:
        inputs = _t5_tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True)
        
        outputs = _t5_model.generate(
            inputs.input_ids,
            max_new_tokens=max_length,
            num_beams=4,
            early_stopping=True
        )
        
        generated_summary = _t5_tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # 如果T5生成的摘要太短、无效或主要是问号，回退到规则方法
        is_invalid = (
            not generated_summary or 
            len(generated_summary) < 10 or 
            generated_summary.count('?') > len(generated_summary) * 0.5 or
            generated_summary.count('？') > len(generated_summary) * 0.5
        )
        
        if is_invalid:
            return generate_summary_with_style(content, length=length, style=style, use_t5=False)
        
        # 生成不同长度的摘要
        short_summary = generated_summary[:50] if len(generated_summary) > 50 else generated_summary
        long_summary = generated_summary + " " + _generate_continue_summary(content, generated_summary)
        
        return {
            "short": _ensure_ending_punctuation(short_summary),
            "medium": _ensure_ending_punctuation(generated_summary),
            "long": _ensure_ending_punctuation(long_summary[:300])
        }
    except Exception as e:
        print(f"T5模型生成失败: {e}")
        return generate_summary_with_style(content, length=length, style=style)


def _generate_continue_summary(content: str, base_summary: str) -> str:
    """基于规则方法生成补充摘要"""
    sentences = _split_sentences(content)
    if not sentences:
        return ""
    
    # 找出与base_summary不同的关键句子
    keywords = _get_keywords(content)
    scored_sentences = []
    
    for i, sentence in enumerate(sentences):
        if sentence in base_summary:
            continue
        score = _score_sentence(sentence, keywords, i, len(sentences), content)
        scored_sentences.append((score, sentence))
    
    scored_sentences.sort(key=lambda x: x[0], reverse=True)
    
    # 添加最重要的补充句子
    additional = ""
    for score, sentence in scored_sentences[:3]:
        if len(additional) + len(sentence) <= 150:
            additional += "。" + sentence
    
    return additional