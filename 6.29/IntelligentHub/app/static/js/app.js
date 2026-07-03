const API_BASE = window.location.origin;

let currentUser = null;
let currentPage = 'news';
let docContent = '';
let currentCaptcha = '';
let captchaSessionKey = '';

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
    const menuItem = document.querySelector(`[data-page="${pageId}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }

    currentPage = pageId;

    if (pageId === 'news') {
        loadNews();
    } else if (pageId === 'sources') {
        loadSources();
    } else if (pageId === 'analysis') {
        loadAnalysis();
    } else if (pageId === 'user-management') {
        loadUsers();
    } else if (pageId === 'history') {
        loadHistory();
    }
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('main-page').classList.add('hidden');
}

function showMainPage(user) {
    currentUser = user;
    document.getElementById('user-name').textContent = user.username;
    document.getElementById('dropdown-username').textContent = user.username;
    document.getElementById('dropdown-role').textContent = user.role === 'admin' ? '管理员' : '用户';
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-page').classList.remove('hidden');
    showPage('news');
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

function closeUserDropdown(event) {
    const dropdown = document.getElementById('user-dropdown');
    const avatarBtn = document.getElementById('user-avatar-btn');
    if (!avatarBtn.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
}

async function generateCaptcha() {
    try {
        const response = await fetch('/auth/captcha');
        const data = await response.json();
        currentCaptcha = data.captcha;
        captchaSessionKey = data.session_key;
        const captchaText = document.getElementById('captcha-text');
        if (captchaText) {
            captchaText.textContent = data.captcha;
        }
    } catch (error) {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let captcha = '';
        for (let i = 0; i < 4; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        currentCaptcha = captcha;
        captchaSessionKey = '';
        const captchaText = document.getElementById('captcha-text');
        if (captchaText) {
            captchaText.textContent = captcha;
        }
    }
}

async function refreshCaptcha() {
    await generateCaptcha();
}

function togglePassword(inputId, btnId) {
    const passwordInput = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    const icon = btn.querySelector('i');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const captcha = document.getElementById('captcha').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, captcha, session_key: captchaSessionKey })
        });

        const data = await response.json();

        if (response.ok) {
            setToken(data.access_token);
            showMainPage({
                username: username,
                role: data.role,
                userId: data.user_id
            });
        } else {
            const errorMsg = data.detail || '登录失败';
            document.getElementById('login-error').textContent = errorMsg;
            document.getElementById('login-error').style.color = '#dc3545';
            await refreshCaptcha();
        }
    } catch (error) {
        document.getElementById('login-error').textContent = '网络错误，请检查连接';
        document.getElementById('login-error').style.color = '#dc3545';
        await refreshCaptcha();
    }
}

function handleRegister() {
    window.location.href = '/auth/register-page';
}

function handleForgotPassword() {
    window.location.href = '/auth/forgot-password-page';
}

function handleLogout() {
    clearToken();
    currentUser = null;
    showLoginPage();
}

async function loadNews() {
    try {
        const [articles, sentimentDist, dailyData, sourceData, sentimentTrend, topKeywords] = await Promise.all([
            apiRequest('/articles/'),
            apiRequest('/analysis/sentiment-distribution'),
            apiRequest('/charts/daily-articles'),
            apiRequest('/charts/source-distribution'),
            apiRequest('/charts/sentiment-trend'),
            apiRequest('/charts/top-keywords')
        ]);
        
        renderNewsList(articles);
        loadSourcesForFilter();
        updateStats(sentimentDist);
        renderDailyChart(dailyData);
        renderSourceChart(sourceData);
        renderSentimentTrendChart(sentimentTrend);
        renderKeywordsChart(topKeywords);
    } catch (error) {
        console.error('加载新闻失败:', error);
    }
}

function updateStats(distribution) {
    document.getElementById('stat-total').textContent = distribution.total || 0;
    document.getElementById('stat-positive').textContent = distribution.positive || 0;
    document.getElementById('stat-negative').textContent = distribution.negative || 0;
    document.getElementById('stat-neutral').textContent = distribution.neutral || 0;
}

function renderDailyChart(data) {
    const chart = echarts.init(document.getElementById('daily-chart'));
    chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: data.dates || [] },
        yAxis: { type: 'value' },
        series: [{
            name: '新闻数量',
            type: 'line',
            smooth: true,
            data: data.counts || [],
            areaStyle: { color: 'rgba(54, 162, 235, 0.2)' },
            itemStyle: { color: '#36a2eb' }
        }]
    });
    window.addEventListener('resize', () => chart.resize());
}

function renderSourceChart(data) {
    const chart = echarts.init(document.getElementById('source-chart'));
    chart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '40%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
            labelLine: { show: false },
            data: (data.sources || []).map((source, index) => ({
                value: data.counts[index] || 0,
                name: source,
                itemStyle: { color: ['#36a2eb', '#ff6384', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'][index % 6] }
            }))
        }]
    });
    window.addEventListener('resize', () => chart.resize());
}

function renderSentimentTrendChart(data) {
    const chart = echarts.init(document.getElementById('sentiment-chart'));
    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['正面', '负面', '中性'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: data.dates || [] },
        yAxis: { type: 'value' },
        series: [
            { name: '正面', type: 'line', smooth: true, data: data.positive || [], itemStyle: { color: '#4bc0c0' } },
            { name: '负面', type: 'line', smooth: true, data: data.negative || [], itemStyle: { color: '#ff6384' } },
            { name: '中性', type: 'line', smooth: true, data: data.neutral || [], itemStyle: { color: '#ffce56' } }
        ]
    });
    window.addEventListener('resize', () => chart.resize());
}

function renderKeywordsChart(data) {
    const chart = echarts.init(document.getElementById('keywords-chart'));
    chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: data.keywords || [], inverse: true },
        series: [{
            type: 'bar',
            data: (data.counts || []).map((count, index) => ({
                value: count,
                itemStyle: { color: `rgba(54, 162, 235, ${0.3 + index * 0.05})` }
            }))
        }]
    });
    window.addEventListener('resize', () => chart.resize());
}

let selectedArticleIds = [];

async function loadHistory() {
    try {
        const articles = await apiRequest('/articles/');
        renderHistoryList(articles);
        selectedArticleIds = [];
        updateDeleteButton();
    } catch (error) {
        console.error('加载历史失败:', error);
    }
}

function renderHistoryList(articles) {
    const container = document.getElementById('history-list');
    container.innerHTML = '';

    if (articles.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">暂无新闻历史</p>';
        return;
    }

    articles.forEach(article => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.dataset.id = article.id;

        const scoreClass = article.score >= 0.5 ? 'score' : 'score low';

        card.innerHTML = `
            <div class="checkbox-container">
                <input type="checkbox" class="article-checkbox" value="${article.id}">
            </div>
            <div class="card-content" onclick="showArticleDetail(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                <h3>${article.title || '无标题'}</h3>
                <p>${article.summary || article.content.substring(0, 150)}...</p>
                <div class="meta">
                    <span>${article.created_at ? new Date(article.created_at).toLocaleString() : '未知时间'}</span>
                    <span class="${scoreClass}">评分: ${article.score.toFixed(2)}</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn btn-sm btn-danger" onclick="deleteSingleArticle(${article.id})">删除</button>
            </div>
        `;

        container.appendChild(card);
    });

    document.querySelectorAll('.article-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', toggleArticleSelection);
    });
}

function toggleArticleSelection(event) {
    const id = parseInt(event.target.value);
    
    if (event.target.checked) {
        selectedArticleIds.push(id);
    } else {
        selectedArticleIds = selectedArticleIds.filter(articleId => articleId !== id);
    }
    
    updateDeleteButton();
}

function updateDeleteButton() {
    const btn = document.getElementById('delete-selected-btn');
    if (selectedArticleIds.length > 0) {
        btn.disabled = false;
        btn.textContent = `删除选中 (${selectedArticleIds.length})`;
    } else {
        btn.disabled = true;
        btn.textContent = '删除选中';
    }
}

async function deleteSelectedArticles() {
    if (selectedArticleIds.length === 0) return;
    
    if (!confirm(`确定要删除选中的 ${selectedArticleIds.length} 篇文章吗？`)) {
        return;
    }

    try {
        await apiRequest('/articles/batch/', {
            method: 'DELETE',
            body: JSON.stringify({ ids: selectedArticleIds })
        });

        selectedArticleIds = [];
        updateDeleteButton();
        loadHistory();
        alert('删除成功');
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function deleteSingleArticle(id) {
    if (!confirm('确定要删除这篇文章吗？')) {
        return;
    }

    try {
        await apiRequest(`/articles/${id}`, {
            method: 'DELETE'
        });

        selectedArticleIds = selectedArticleIds.filter(articleId => articleId !== id);
        updateDeleteButton();
        loadHistory();
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function clearAllArticles() {
    if (!confirm('确定要清空所有新闻历史吗？此操作不可恢复！')) {
        return;
    }

    try {
        await apiRequest('/articles/clear/', {
            method: 'DELETE'
        });

        selectedArticleIds = [];
        updateDeleteButton();
        loadHistory();
        alert('清空成功');
    } catch (error) {
        alert('清空失败: ' + error.message);
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
    document.getElementById('user-modal').classList.add('hidden');
    document.getElementById('crawl-modal').classList.add('hidden');
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
                <button class="btn btn-success" onclick="crawlSource(${source.id})">爬取</button>
                <button class="btn btn-secondary" onclick="deleteSource(${source.id})">删除</button>
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

async function crawlSource(sourceId) {
    if (!confirm('确定要爬取这个信源的新闻吗？')) {
        return;
    }

    try {
        const result = await apiRequest(`/sources/${sourceId}/crawl?max_depth=2&max_articles=10`, {
            method: 'POST'
        });

        const ingested = result.results.filter(r => r.status === 'ingested').length;
        const skipped = result.results.filter(r => r.status === 'skipped').length;
        alert(`爬取完成！共发现 ${result.total_found} 篇文章，成功导入 ${ingested} 篇，跳过 ${skipped} 篇`);
        loadNews();
    } catch (error) {
        alert('爬取失败: ' + error.message);
    }
}

function handleCrawlUrl() {
    const modal = document.getElementById('crawl-modal');
    document.getElementById('crawl-url').value = '';
    document.getElementById('crawl-depth').value = '2';
    document.getElementById('crawl-limit').value = '10';
    document.getElementById('crawl-progress').classList.add('hidden');
    document.getElementById('crawl-form').classList.remove('hidden');
    modal.classList.remove('hidden');
}

async function handleCrawlSubmit(event) {
    event.preventDefault();

    const url = document.getElementById('crawl-url').value;
    const depth = document.getElementById('crawl-depth').value;
    const limit = document.getElementById('crawl-limit').value;

    if (!url) {
        alert('请输入网址');
        return;
    }

    try {
        document.getElementById('crawl-form').classList.add('hidden');
        document.getElementById('crawl-progress').classList.remove('hidden');
        document.getElementById('crawl-status').textContent = '正在爬取中，请稍候...';

        const result = await apiRequest(`/sources/crawl-url?url=${encodeURIComponent(url)}&max_depth=${depth}&max_articles=${limit}`, {
            method: 'POST'
        });

        const ingested = result.results.filter(r => r.status === 'ingested').length;
        const skipped = result.results.filter(r => r.status === 'skipped').length;
        
        document.getElementById('crawl-status').textContent = `爬取完成！共发现 ${result.total_found} 篇文章，成功导入 ${ingested} 篇，跳过 ${skipped} 篇`;
        
        setTimeout(() => {
            closeModal();
            loadNews();
        }, 2000);
    } catch (error) {
        document.getElementById('crawl-status').textContent = '爬取失败: ' + error.message;
        setTimeout(() => {
            document.getElementById('crawl-form').classList.remove('hidden');
            document.getElementById('crawl-progress').classList.add('hidden');
        }, 2000);
    }
}

async function loadUsers() {
    try {
        const users = await apiRequest('/auth/users');
        renderUsersList(users);
    } catch (error) {
        console.error('加载用户失败:', error);
    }
}

function renderUsersList(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">暂无用户数据</p>';
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'user-card';

        const roleClass = user.role === 'admin' ? 'admin' : 'user';
        const roleText = user.role === 'admin' ? '管理员' : '普通用户';

        card.innerHTML = `
            <div class="info">
                <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
                <div>
                    <h4>${user.username}</h4>
                    <p>ID: ${user.id}</p>
                </div>
            </div>
            <span class="role-badge ${roleClass}">${roleText}</span>
        `;

        container.appendChild(card);
    });
}

function handleAddUser() {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    title.textContent = '添加用户';

    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = 'user';

    modal.classList.remove('hidden');
}

async function handleUserSubmit(event) {
    event.preventDefault();

    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;

    try {
        await apiRequest('/auth/admin-create-user', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });

        closeModal();
        loadUsers();
    } catch (error) {
        alert('添加失败: ' + error.message);
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

        let targetArticle;
        if (ingestResult.kept) {
            const articles = await apiRequest('/articles/');
            targetArticle = articles[articles.length - 1];
        } else {
            targetArticle = await apiRequest(`/articles/by-url/?url=${encodeURIComponent(url)}`);
        }

        if (targetArticle) {
            const summaryResult = await apiRequest(`/articles/${targetArticle.id}/summary?length=${length}&style=${style}`, {
            method: 'POST'
        });

        displaySummaryResult(summaryResult);
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

        const titleResult = await apiRequest('/articles/title', {
            method: 'POST',
            body: JSON.stringify({ content, style })
        });

        summaryResult.generated_title = titleResult.title;
        displaySummaryResult(summaryResult);
    } catch (error) {
        alert('生成摘要失败: ' + error.message);
    }
}

async function handleDocUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        docContent = e.target.result;
        document.getElementById('doc-filename').textContent = file.name;
        document.getElementById('doc-content-preview').textContent = docContent.substring(0, 500) + (docContent.length > 500 ? '...' : '');
        document.getElementById('doc-upload-area').classList.add('hidden');
        document.getElementById('doc-preview').classList.remove('hidden');
    };
    reader.readAsText(file);
}

function handleDocClear() {
    docContent = '';
    document.getElementById('doc-file-input').value = '';
    document.getElementById('doc-upload-area').classList.remove('hidden');
    document.getElementById('doc-preview').classList.add('hidden');
}

async function handleSummaryFromDoc() {
    const content = docContent;
    const length = document.getElementById('summary-length').value;
    const style = document.getElementById('summary-style').value;

    if (!content) {
        alert('请先上传文档');
        return;
    }

    try {
        const summaryResult = await apiRequest('/articles/summary', {
            method: 'POST',
            body: JSON.stringify({
                content,
                length,
                style
            })
        });

        const titleResult = await apiRequest('/articles/title', {
            method: 'POST',
            body: JSON.stringify({ content, style })
        });

        summaryResult.generated_title = titleResult.title;
        displaySummaryResult(summaryResult);
    } catch (error) {
        alert('生成摘要失败: ' + error.message);
    }
}

function displaySummaryResult(summary) {
    const resultContainer = document.getElementById('summary-result');
    resultContainer.classList.remove('hidden');

    document.getElementById('generated-title').textContent = summary.generated_title || '未能生成标题';
    document.getElementById('summary-short-content').textContent = summary.summary_short;
    document.getElementById('summary-medium-content').textContent = summary.summary_medium;
    document.getElementById('summary-long-content').textContent = summary.summary_long;

    switchSummaryTab('medium');

    const sentimentContainer = document.getElementById('sentiment-result');
    sentimentContainer.innerHTML = `
        <div class="score ${summary.sentiment_label}">${summary.sentiment_score || '0.0'}</div>
        <p>情感倾向: ${summary.sentiment_label === 'positive' ? '正面' : summary.sentiment_label === 'negative' ? '负面' : '中立'}</p>
        <p>情感类型: ${summary.emotion_label_cn || '中立'}</p>
    `;

    const categoryContainer = document.getElementById('category-result');
    if (categoryContainer) {
        categoryContainer.innerHTML = `
            <h4>新闻分类</h4>
            <div class="category-tag">${summary.primary_category || '其他'}</div>
            <p>分类置信度: ${(summary.category_confidence * 100 || 0).toFixed(0)}%</p>
        `;
    }
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

function handleCopyAll() {
    const title = document.getElementById('generated-title').textContent;
    const medium = document.getElementById('summary-medium-content').textContent;
    const text = `标题: ${title}\n\n摘要:\n${medium}`;

    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
    });
}

let speechSynthesisUtterance = null;

function speakSummary() {
    const title = document.getElementById('generated-title').textContent;
    const activeTab = document.querySelector('.summary-tab-btn.active');
    const tabName = activeTab ? activeTab.dataset.summary : 'medium';
    const content = document.getElementById(`summary-${tabName}-content`).textContent;
    
    const textToSpeak = `${title}。${content}`;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        speechSynthesisUtterance = new SpeechSynthesisUtterance(textToSpeak);
        speechSynthesisUtterance.lang = 'zh-CN';
        speechSynthesisUtterance.rate = 1;
        
        speechSynthesisUtterance.onstart = () => {
            document.getElementById('speak-btn').classList.add('hidden');
            document.getElementById('stop-speak-btn').classList.remove('hidden');
        };
        
        speechSynthesisUtterance.onend = () => {
            document.getElementById('speak-btn').classList.remove('hidden');
            document.getElementById('stop-speak-btn').classList.add('hidden');
        };
        
        speechSynthesisUtterance.onerror = () => {
            document.getElementById('speak-btn').classList.remove('hidden');
            document.getElementById('stop-speak-btn').classList.add('hidden');
        };
        
        window.speechSynthesis.speak(speechSynthesisUtterance);
    } else {
        alert('您的浏览器不支持语音朗读功能');
    }
}

function stopSpeak() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        document.getElementById('speak-btn').classList.remove('hidden');
        document.getElementById('stop-speak-btn').classList.add('hidden');
    }
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
    // 检查注册成功参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('register_success') === 'true') {
        document.getElementById('login-error').textContent = '注册成功！请登录';
        document.getElementById('login-error').style.color = '#28a745';
    }

    generateCaptcha();

    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            togglePassword('password', 'toggle-password');
        });
    }

    const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', () => {
            togglePassword('confirm-password', 'toggle-confirm-password');
        });
    }

    const captchaImage = document.getElementById('captcha-image');
    if (captchaImage) {
        captchaImage.addEventListener('click', refreshCaptcha);
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    const registerBtn = document.getElementById('register-btn');
    const registerLink = document.getElementById('register-link');
    if (registerBtn) {
        registerBtn.addEventListener('click', handleRegister);
    } else if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleRegister();
        });
    }

    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', handleForgotPassword);
    } else if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleForgotPassword();
        });
    }
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('user-avatar-btn').addEventListener('click', toggleUserDropdown);
    document.addEventListener('click', closeUserDropdown);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('close-source-modal').addEventListener('click', closeModal);
    document.getElementById('close-user-modal').addEventListener('click', closeModal);
    document.getElementById('add-source-btn').addEventListener('click', handleAddSource);
    document.getElementById('source-form').addEventListener('submit', handleSourceSubmit);
    document.getElementById('crawl-url-btn').addEventListener('click', handleCrawlUrl);
    document.getElementById('crawl-form').addEventListener('submit', handleCrawlSubmit);
    document.getElementById('close-crawl-modal').addEventListener('click', closeModal);
    document.getElementById('add-user-btn').addEventListener('click', handleAddUser);
    document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('filter-btn').addEventListener('click', handleFilter);
    document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedArticles);
    document.getElementById('clear-all-btn').addEventListener('click', clearAllArticles);

    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            showPage(item.dataset.page);
        });
    });

    document.getElementById('menu-sources').addEventListener('click', () => {
        document.getElementById('user-dropdown').classList.add('hidden');
        showPage('sources');
    });

    document.getElementById('menu-user-management').addEventListener('click', () => {
        document.getElementById('user-dropdown').classList.add('hidden');
        showPage('user-management');
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
    document.getElementById('summary-generate-btn').addEventListener('click', handleSummaryFromText);
    document.getElementById('doc-file-input').addEventListener('change', handleDocUpload);
    document.getElementById('doc-clear-btn').addEventListener('click', handleDocClear);
    document.getElementById('doc-generate-btn').addEventListener('click', handleSummaryFromDoc);
    document.getElementById('copy-all-btn').addEventListener('click', handleCopyAll);
    document.getElementById('speak-btn').addEventListener('click', speakSummary);
    document.getElementById('stop-speak-btn').addEventListener('click', stopSpeak);
    document.getElementById('word-sentiment-btn').addEventListener('click', handleWordSentimentAnalysis);

    document.getElementById('doc-upload-area').addEventListener('click', () => {
        document.getElementById('doc-file-input').click();
    });

    const token = getToken();
    if (token) {
        showMainPage({ username: '用户', role: 'user' });
    } else {
        showLoginPage();
    }
});