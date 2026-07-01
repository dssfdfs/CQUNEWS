from __future__ import annotations

import random
import re
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from .config import settings
from .database import CrawlLog, CrawlSource, News, Session, engine, select
from .logger import logger


@dataclass
class CrawledItem:
    title: str
    url: str
    summary: str = ""
    content: str = ""
    published_at: str | None = None
    source: str = ""
    category: str = ""
    views: int = 0
    is_trending: bool = False


@dataclass
class CrawlResult:
    source_name: str
    items: list[CrawledItem] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _session() -> requests.Session:
    s = requests.Session()
    headers = {
        "User-Agent": random.choice(settings.USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
    }
    s.headers.update(headers)
    return s


def _polite_sleep() -> None:
    delay = random.uniform(settings.CRAWL_DELAY_MIN, settings.CRAWL_DELAY_MAX)
    time.sleep(delay)


def _extract_published_at(text: str) -> str | None:
    if not text:
        return None
    patterns = [
        r"(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})[日 ]?(\d{1,2})[:：]?(\d{1,2})?",
        r"(20\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?",
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            try:
                g = m.groups()
                if len(g) == 5 and g[4] is not None:
                    return f"{g[0]}-{int(g[1]):02d}-{int(g[2]):02d} {int(g[3]):02d}:{int(g[4]):02d}:00"
                if len(g) == 4:
                    return f"{g[0]}-{int(g[1]):02d}-{int(g[2]):02d} {int(g[3]):02d}:00:00"
            except Exception:
                continue
    return None


def _clean_html(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "iframe", "form", "aside"]):
        tag.decompose()
    for tag in soup.select(".ad, .ads, .sidebar, .related, .recommend, .footer, .header, nav, .nav"):
        tag.decompose()
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip().split("-")[0].split("|")[0].strip()
    article = (
        soup.find("article")
        or soup.find(class_=re.compile(r"article|content|news", re.I))
        or soup
    )
    text = article.get_text(separator="\n", strip=True)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    content = "\n".join(lines)
    summary = content[:120] if content else ""
    published = None
    time_tag = soup.find("span", class_=re.compile(r"time|date|pub", re.I)) or soup.find(
        "meta", attrs={"property": "article:published_time"}
    )
    if time_tag:
        if time_tag.name == "meta":
            published = _extract_published_at(time_tag.get("content", ""))
        else:
            published = _extract_published_at(time_tag.get_text())
    if not published:
        published = _extract_published_at(soup.get_text()[:2000])
    return title, summary, content, published  # type: ignore[return-value]


def _decode_response(resp: requests.Response) -> str:
    raw = resp.content
    encodings: list[str] = []
    if resp.encoding:
        encodings.append(resp.encoding)
    if resp.apparent_encoding:
        encodings.append(resp.apparent_encoding)
    encodings.extend(["utf-8", "gb18030", "gbk", "gb2312", "big5", "latin-1"])
    seen: set[str] = set()
    for enc in encodings:
        if not enc:
            continue
        enc = enc.lower()
        if enc in seen:
            continue
        seen.add(enc)
        try:
            decoded = raw.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
        if "\ufffd" in decoded:
            continue
        if re.search(r"[\u4e00-\u9fff]", decoded):
            return decoded
        if enc in ("utf-8", "latin-1"):
            return decoded
    return raw.decode("utf-8", errors="replace")


def _fetch_list_page(session: requests.Session, url: str) -> str | None:
    try:
        resp = session.get(url, timeout=settings.CRAWL_TIMEOUT)
        if resp.status_code == 403:
            logger.warning("Blocked (403) by %s", url)
            return None
        if resp.status_code != 200:
            logger.warning("Non-200 status %s for %s", resp.status_code, url)
            return None
        return _decode_response(resp)
    except requests.RequestException as e:
        logger.error("Fetch list failed %s: %s", url, e)
        return None


def _extract_links(html: str, base_url: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    items: list[tuple[str, str]] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "").strip()
        text = a.get_text(strip=True)
        if not href or not text or len(text) < 6:
            continue
        if any(k in text.lower() for k in ["更多", "下一页", "上一页", "首页", "末页", "登录", "注册", "设为首页", "加入收藏", "关于"]):
            continue
        if href.startswith("javascript:") or href.startswith("#") or href.startswith("mailto:"):
            continue
        abs_url = urljoin(base_url, href)
        parsed = urlparse(abs_url)
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc != urlparse(base_url).netloc:
            continue
        if len(href) > 80:
            continue
        if not re.search(r"\d", abs_url) and not re.search(r"\.html?$", abs_url):
            continue
        if re.search(r"/(index|list|more|search|tag|video|special|zt)/?$", abs_url):
            continue
        if abs_url in seen:
            continue
        seen.add(abs_url)
        items.append((text, abs_url))
    return items


def _classify_category(title: str, summary: str, content: str, default: str = "") -> str:
    text = f"{title} {summary} {content[:500]}".lower()

    rules: list[tuple[str, list[str]]] = [
        ("财经", ["财经", "金融", "经济", "股市", "基金", "债券", "银行", "央行", "货币", "通胀",
                  "GDP", "投资", "理财", "股票", "A股", "港股", "美股", "证券", "期货", "外汇",
                  "房地产", "楼市", "房价", "产业", "经济增长", "贸易", "商业", "公司", "企业营收",
                  "财经网", "财经频道", "经济日报"]),
        ("体育", ["体育", "足球", "篮球", "NBA", "CBA", "奥运会", "奥运", "世界杯", "锦标赛",
                  "冠军", "联赛", "球员", "球队", "比赛", "赛事", "冠军赛", "竞技", "田径",
                  "游泳", "乒乓球", "羽毛球", "排球", "网球", "拳击", "F1", "赛车", "马拉松",
                  "冠军", "亚军", "季军", "晋级", "决赛", "半决赛"]),
        ("娱乐", ["娱乐", "明星", "电影", "电视剧", "综艺", "演员", "歌手", "偶像", "流量",
                  "粉丝", "演唱会", "专辑", "唱片", "票房", "热播", "网剧", "真人秀", "选秀",
                  "音乐", "舞蹈", "影视", "娱乐圈", "八卦", "红毯", "颁奖典礼", "奥斯卡",
                  "格莱美", "金曲奖"]),
        ("健康", ["健康", "医疗", "医药", "医院", "医生", "疾病", "病毒", "疫苗", "药品",
                  "处方", "手术", "患者", "治疗", "保健", "养生", "疫情", "传染病", "慢性病",
                  "心理健康", "营养", "运动", "睡眠", "中医", "西医", "诊疗", "体检"]),
        ("科技", ["科技", "技术", "AI", "人工智能", "芯片", "半导体", "计算机", "互联网",
                  "5G", "6G", "智能手机", "机器人", "自动驾驶", "新能源", "光伏", "储能",
                  "航天", "航空", "卫星", "SpaceX", "SpaceX星舰", "生物技术", "基因",
                  "量子", "区块链", "元宇宙", "VR", "AR", "MR", "虚拟现实"]),
        ("时政", ["时政", "政治", "政府", "国务院", "人大", "政协", "党", "中央", "总书记",
                  "主席", "总理", "部长", "政策", "法规", "立法", "选举", "总统", "议会",
                  "执政", "在野", "政党", "意识形态"]),
        ("国际", ["国际", "全球", "外国", "美国", "俄罗斯", "欧洲", "欧盟", "日本", "韩国",
                  "东盟", "联合国", "外交", "大使", "出访", "峰会", "国际关系", "国际社会",
                  "海外", "境外", "巴黎", "伦敦", "华盛顿", "纽约", "东京", "首尔"]),
    ]

    for cat, keywords in rules:
        for kw in keywords:
            if kw.lower() in text:
                return cat

    if default:
        return default
    return "综合"


def fetch_article(session: requests.Session, url: str, source_name: str, category: str) -> CrawledItem | None:
    try:
        logger.debug("Fetching article: %s", url)
        resp = session.get(url, timeout=settings.CRAWL_TIMEOUT)
        if resp.status_code != 200:
            logger.debug("Non-200 %s for %s", resp.status_code, url)
            return None
        text = _decode_response(resp)
        title, summary, content, published = _clean_html(text)
        if not title or len(content) < 40:
            return None
        classified = _classify_category(title, summary, content, category)
        return CrawledItem(
            title=title[:200],
            url=url,
            summary=summary,
            content=content[:8000],
            published_at=published,
            source=source_name,
            category=classified,
            views=random.randint(50, 20000),
            is_trending=random.random() < 0.2,
        )
    except requests.RequestException as e:
        logger.debug("Fetch article failed %s: %s", url, e)
        return None


def crawl_source(source: CrawlSource, max_articles: int = 15) -> CrawlResult:
    result = CrawlResult(source_name=source.name)
    started = time.time()
    session = _session()
    try:
        html = _fetch_list_page(session, source.url)
        if not html:
            result.errors.append(f"failed to fetch list page: {source.url}")
            return result
        links = _extract_links(html, source.url)
        if not links:
            result.errors.append("no article links parsed from list page")
            return result
        logger.info("Found %d candidate links from %s", len(links), source.name)
        for title_text, abs_url in links[:max_articles]:
            _polite_sleep()
            item = fetch_article(session, abs_url, source.name, source.category or "")
            if item is not None:
                result.items.append(item)
            if len(result.items) >= max_articles:
                break
    except Exception as e:  # noqa: BLE001
        logger.error("Crawl source %s crashed: %s\n%s", source.name, e, traceback.format_exc())
        result.errors.append(str(e))

    duration_ms = int((time.time() - started) * 1000)
    _persist_crawl(source, result, duration_ms)
    return result


def _persist_crawl(source: CrawlSource, result: CrawlResult, duration_ms: int) -> None:
    now = _now()
    success = 0
    failed = len(result.errors)
    with Session(engine) as db:
        try:
            for item in result.items:
                exists = db.exec(
                    select(News).where(News.original_url == item.url)
                ).first()
                if exists:
                    continue
                news = News(
                    title=item.title,
                    summary=item.summary,
                    content=item.content,
                    category=item.category,
                    source=item.source,
                    original_url=item.url,
                    published_at=item.published_at or now,
                    views=item.views,
                    is_trending=1 if item.is_trending else 0,
                    crawl_status=1,
                    created_at=now,
                    updated_at=now,
                )
                db.add(news)
                success += 1
            db.commit()

            log = CrawlLog(
                source_id=source.id,
                source_name=source.name,
                status="success" if not result.errors else "partial",
                total=len(result.items) + failed,
                success=success,
                failed=failed,
                error_msg="; ".join(result.errors)[:2000] if result.errors else None,
                duration_ms=duration_ms,
                created_at=now,
            )
            db.add(log)

            if source.id is not None:
                s = db.get(CrawlSource, source.id)
                if s is not None:
                    s.last_crawl_at = now
            db.commit()
        except Exception as e:  # noqa: BLE001
            logger.error("Persist crawl failed: %s", e)
            db.rollback()


def run_crawl(sources: Iterable[CrawlSource] | None = None, max_articles_per_source: int = 8) -> list[CrawlResult]:
    with Session(engine) as db:
        if sources is None:
            sources = list(db.exec(select(CrawlSource).where(CrawlSource.enabled == 1)).all())  # type: ignore[attr-defined]
        else:
            sources = list(sources)
    results: list[CrawlResult] = []
    for src in sources:
        logger.info("Start crawling: %s", src.name)
        try:
            r = crawl_source(src, max_articles=max_articles_per_source)
            results.append(r)
            logger.info(
                "Crawl done: %s — %d items, %d errors",
                src.name,
                len(r.items),
                len(r.errors),
            )
        except Exception as e:  # noqa: BLE001
            logger.error("Unhandled crawl error for %s: %s", src.name, e)
    return results


def run_crawl_by_source_ids(ids: list[int], max_articles_per_source: int = 8) -> list[CrawlResult]:
    with Session(engine) as db:
        sources = list(db.exec(select(CrawlSource).where(CrawlSource.id.in_(ids))).all())  # type: ignore[attr-defined]
    return run_crawl(sources, max_articles_per_source=max_articles_per_source)
