const API_BASE = 'http://127.0.0.1:8001';

let currentUser = null;
let currentPage = 'news';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '请求失败');
    }
    
    return response.json();
}

function showPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(`${pageId}-page`).classList.remove('hidden');
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    
    currentPage = pageId;
    
    if (pageId === 'news') {
        loadNews();
    } else if (pageId === 'sources') {
        loadSources();
    } else if (pageId === 'analysis') {
        loadAnalysis();
    }
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-page').classList.add('hidden');
}

function showMainPage(user) {
    currentUser = user;
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-role').textContent = user.role;
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-page').classList.remove('hidden');
    showPage('news');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        setToken(response.access_token);
        showMainPage({
            username: response.user_id,
            role: response.role
        });
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
}

async function handleRegister() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, role: 'user' })
        });
        
        document.getElementById('login-error').textContent = '注册成功，请登录';
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    }
}

function handleLogout() {
    clearToken();
    currentUser = null;
    showLoginPage();
}

async function loadNews() {
    try {
        const articles = await apiRequest('/articles/');
        renderNewsList(articles);
        loadSourcesForFilter();
    } catch (error) {
        console.error('加载新闻失败:', error);
    }
}

function renderNewsList(articles) {
    const container = document.getElementById('news-list');
    container.innerHTML = '';
    
    if (articles.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">暂无新闻数据</p>';
        return;
    }
    
    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.onclick = () => showArticleDetail(article);
        
        const scoreClass = article.score >= 0.5 ? 'score' : 'score low';
        
        card.innerHTML = `
            <h3>${article.title || '无标题'}</h3>
            <p>${article.summary || article.content.substring(0, 200)}...</p>
            <div class="meta">
                <span>${article.published_at ? new Date(article.published_at).toLocaleDateString() : '未知时间'}</span>
                <span class="${scoreClass}">评分: ${article.score.toFixed(2)}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

async function showArticleDetail(article) {
    const modal = document.getElementById('article-modal');
    const title = document.getElementById('modal-title');
    const content = document.getElementById('modal-content');
    
    title.textContent = article.title || '文章详情';
    content.innerHTML = `
        <h4>摘要</h4>
        <p>${article.summary || '暂无摘要'}</p>
        <h4>正文</h4>
        <p>${article.content || '暂无内容'}</p>
        <h4>来源</h4>
        <p>ID: ${article.source_id}</p>
        <h4>评分</h4>
        <p>${article.score.toFixed(2)}</p>
        <h4>情绪</h4>
        <p>标签: ${article.sentiment_label || 'neutral'}, 分数: ${article.sentiment_score || 0}</p>
    `;
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('article-modal').classList.add('hidden');
    document.getElementById('source-modal').classList.add('hidden');
}

async function loadSources() {
    try {
        const sources = await apiRequest('/sources/');
        renderSourcesList(sources);
    } catch (error) {
        console.error('加载信源失败:', error);
    }
}

function renderSourcesList(sources) {
    const container = document.getElementById('sources-list');
    container.innerHTML = '';
    
    if (sources.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">暂无信源数据</p>';
        return;
    }
    
    sources.forEach(source => {
        const card = document.createElement('div');
        card.className = 'source-card';
        
        card.innerHTML = `
            <div class="info">
                <h4>${source.name}</h4>
                <p>${source.url}</p>
                <p>类型: ${source.source_type}</p>
            </div>
            <div class="actions">
                <button class="btn btn-secondary" onclick="editSource(${source.id})">编辑</button>
                <button class="btn btn-danger" onclick="deleteSource(${source.id})">删除</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

async function loadSourcesForFilter() {
    try {
        const sources = await apiRequest('/sources/');
        const select = document.getElementById('filter-source');
        select.innerHTML = '<option value="">全部信源</option>';
        
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = source.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载信源失败:', error);
    }
}

async function handleAddSource() {
    const modal = document.getElementById('source-modal');
    const title = document.getElementById('source-modal-title');
    title.textContent = '添加信源';
    
    document.getElementById('source-name').value = '';
    document.getElementById('source-url').value = '';
    document.getElementById('source-type').value = 'website';
    document.getElementById('source-rss').value = '';
    
    modal.classList.remove('hidden');
}

async function handleSourceSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('source-name').value;
    const url = document.getElementById('source-url').value;
    const sourceType = document.getElementById('source-type').value;
    const rssUrl = document.getElementById('source-rss').value;
    
    try {
        await apiRequest('/sources/', {
            method: 'POST',
            body: JSON.stringify({
                name,
                url,
                source_type: sourceType,
                rss_url: rssUrl || null
            })
        });
        
        closeModal();
        loadSources();
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
}

async function deleteSource(id) {
    if (!confirm('确定要删除这个信源吗？')) {
        return;
    }
    
    try {
        await apiRequest(`/sources/${id}`, {
            method: 'DELETE'
        });
        
        loadSources();
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function loadAnalysis() {
    try {
        const hotKeywords = await apiRequest('/analysis/hot-keywords');
        const wordCloud = await apiRequest('/analysis/word-cloud');
        const events = await apiRequest('/analysis/events');
        const sentimentDistribution = await apiRequest('/analysis/sentiment-distribution');
        
        renderHotKeywords(hotKeywords);
        renderWordCloud(wordCloud);
        renderEvents(events);
        renderSentimentDistribution(sentimentDistribution);
    } catch (error) {
        console.error('加载分析数据失败:', error);
    }
}

function renderHotKeywords(keywords) {
    const container = document.getElementById('hot-keywords');
    container.innerHTML = '';
    
    if (!keywords || keywords.length === 0) {
        container.innerHTML = '<p class="text-gray-500">暂无热点关键词</p>';
        return;
    }
    
    keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'keyword-tag';
        tag.textContent = `${keyword.word} (${keyword.count})`;
        container.appendChild(tag);
    });
}

function renderWordCloud(data) {
    const container = document.getElementById('word-cloud');
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-gray-500">暂无词云数据</p>';
        return;
    }
    
    const maxFreq = Math.max(...data.map(item => item.frequency));
    
    data.forEach(item => {
        const span = document.createElement('span');
        span.className = 'word-cloud-item';
        span.textContent = item.word;
        span.style.fontSize = `${14 + (item.frequency / maxFreq) * 20}px`;
        span.style.opacity = 0.6 + (item.frequency / maxFreq) * 0.4;
        container.appendChild(span);
    });
}

function renderEvents(events) {
    const container = document.getElementById('events-list');
    container.innerHTML = '';
    
    if (!events || events.length === 0) {
        container.innerHTML = '<p class="text-gray-500">暂无事件聚类</p>';
        return;
    }
    
    events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        
        item.innerHTML = `
            <h4>${event.name}</h4>
            <p>包含 ${event.articles.length} 篇文章</p>
        `;
        
        container.appendChild(item);
    });
}

function renderSentimentDistribution(distribution) {
    const container = document.getElementById('sentiment-distribution');
    container.innerHTML = '';
    
    if (!distribution || distribution.total === 0) {
        container.innerHTML = '<p class="text-gray-500">暂无情绪数据</p>';
        return;
    }
    
    const maxCount = Math.max(distribution.positive, distribution.negative, distribution.neutral);
    
    const items = [
        { label: '正面', value: distribution.positive, class: 'positive' },
        { label: '负面', value: distribution.negative, class: 'negative' },
        { label: '中性', value: distribution.neutral, class: 'neutral' }
    ];
    
    items.forEach(item => {
        const percent = maxCount > 0 ? (item.value / maxCount) * 100 : 0;
        const bar = document.createElement('div');
        bar.className = `sentiment-bar ${item.class}`;
        bar.style.width = `${percent}%`;
        bar.textContent = `${item.label}: ${item.value}`;
        container.appendChild(bar);
    });
}

async function handleWordSentimentAnalysis() {
    const keyword = document.getElementById('word-sentiment-input').value;
    
    if (!keyword) {
        alert('请输入关键词');
        return;
    }
    
    try {
        const result = await apiRequest(`/analysis/word-sentiment?keyword=${encodeURIComponent(keyword)}`);
        
        const resultContainer = document.getElementById('word-sentiment-result');
        resultContainer.classList.remove('hidden');
        
        resultContainer.innerHTML = `
            <div class="score ${result.sentiment_label}">${result.sentiment_score}</div>
            <p>关键词: ${result.keyword}</p>
            <p>情绪标签: ${result.sentiment_label}</p>
            <p>相关文章数: ${result.count}</p>
        `;
    } catch (error) {
        alert('分析失败: ' + error.message);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
}

async function handleSummaryFromUrl() {
    const url = document.getElementById('summary-url').value;
    const length = document.getElementById('summary-length').value;
    const style = document.getElementById('summary-style').value;
    
    if (!url) {
        alert('请输入文章URL');
        return;
    }
    
    try {
        const ingestResult = await apiRequest('/articles/ingest', {
            method: 'POST',
            body: JSON.stringify({ url })
        });
        
        const articles = await apiRequest('/articles/');
        const latestArticle = articles[articles.length - 1];
        
        if (latestArticle) {
            const summaryResult = await apiRequest(`/articles/${latestArticle.id}/summary?length=${length}&style=${style}`);
            const sentimentResult = await apiRequest(`/articles/${latestArticle.id}/sentiment`);
            
            displaySummaryResult(summaryResult, sentimentResult);
        }
    } catch (error) {
        alert('生成摘要失败: ' + error.message);
    }
}

async function handleSummaryFromText() {
    const title = document.getElementById('summary-title').value;
    const content = document.getElementById('summary-content').value;
    const length = document.getElementById('summary-length').value;
    const style = document.getElementById('summary-style').value;
    
    if (!content) {
        alert('请输入文章内容');
        return;
    }
    
    try {
        const summaryResult = await apiRequest('/articles/summary', {
            method: 'POST',
            body: JSON.stringify({
                content,
                title,
                length,
                style
            })
        });
        
        const sentimentResult = await apiRequest('/articles/sentiment', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        displaySummaryResult(summaryResult, sentimentResult);
    } catch (error) {
        alert('生成摘要失败: ' + error.message);
    }
}

function displaySummaryResult(summary, sentiment) {
    const resultContainer = document.getElementById('summary-result');
    resultContainer.classList.remove('hidden');
    
    document.getElementById('summary-short-content').textContent = summary.summary_short;
    document.getElementById('summary-medium-content').textContent = summary.summary_medium;
    document.getElementById('summary-long-content').textContent = summary.summary_long;
    
    switchSummaryTab('short');
    
    const sentimentContainer = document.getElementById('sentiment-result');
    sentimentContainer.innerHTML = `
        <div class="score ${sentiment.sentiment_label}">${sentiment.sentiment_score}</div>
        <p>情绪标签: ${sentiment.sentiment_label}</p>
        ${sentiment.positive_words && sentiment.positive_words.length > 0 ? `<p>正面词汇: ${sentiment.positive_words.join(', ')}</p>` : ''}
        ${sentiment.negative_words && sentiment.negative_words.length > 0 ? `<p>负面词汇: ${sentiment.negative_words.join(', ')}</p>` : ''}
    `;
}

function switchSummaryTab(tabName) {
    document.querySelectorAll('.summary-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-summary="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.summary-text').forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(`summary-${tabName}-content`).classList.remove('hidden');
}

async function handleSearch() {
    const keyword = document.getElementById('search-input').value;
    
    if (!keyword) {
        loadNews();
        return;
    }
    
    try {
        const articles = await apiRequest(`/articles/search/?keyword=${encodeURIComponent(keyword)}`);
        renderNewsList(articles);
    } catch (error) {
        console.error('搜索失败:', error);
    }
}

async function handleFilter() {
    const keyword = document.getElementById('filter-keyword').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    const sourceId = document.getElementById('filter-source').value;
    
    let url = '/articles/search/?';
    
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}&`;
    if (sourceId) url += `source_id=${sourceId}&`;
    
    try {
        const articles = await apiRequest(url);
        renderNewsList(articles);
    } catch (error) {
        console.error('筛选失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('close-source-modal').addEventListener('click', closeModal);
    document.getElementById('add-source-btn').addEventListener('click', handleAddSource);
    document.getElementById('source-form').addEventListener('submit', handleSourceSubmit);
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('filter-btn').addEventListener('click', handleFilter);
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            showPage(item.dataset.page);
        });
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });
    
    document.querySelectorAll('.summary-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchSummaryTab(btn.dataset.summary);
        });
    });
    
    document.getElementById('summary-url-btn').addEventListener('click', handleSummaryFromUrl);
    document.getElementById('summary-text-btn').addEventListener('click', handleSummaryFromText);
    document.getElementById('word-sentiment-btn').addEventListener('click', handleWordSentimentAnalysis);
    
    const token = getToken();
    if (token) {
        showMainPage({ username: '用户', role: 'user' });
    } else {
        showLoginPage();
    }
});