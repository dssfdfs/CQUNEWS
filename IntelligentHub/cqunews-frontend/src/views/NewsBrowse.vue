<template>
  <div class="news-browse-container">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">新闻速览</h1>
        <p class="page-subtitle">快速浏览和搜索最新新闻内容</p>
      </div>
      
      <!-- 搜索区域 -->
      <div class="search-section">
        <div class="search-box">
          <div class="search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索新闻标题、内容..." 
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>
        <div class="filter-options">
          <select v-model="selectedCategory" class="filter-select">
            <option value="">所有分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <select v-model="selectedSort" class="filter-select">
            <option value="latest">最新发布</option>
            <option value="popular">最受欢迎</option>
            <option value="trending">热点趋势</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 新闻列表 -->
    <div class="news-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在加载新闻...</p>
      </div>
      
      <div v-else-if="filteredNews.length === 0" class="empty-state">
        <div class="empty-icon">📰</div>
        <h3>暂无新闻内容</h3>
        <p>尝试调整搜索条件或稍后再来</p>
      </div>
      
      <div v-else class="news-grid">
        <div 
          v-for="news in filteredNews" 
          :key="news.id" 
          class="news-card"
          @click="viewNewsDetail(news)"
        >
          <div class="news-image">
            <div class="image-placeholder">
              <span>📰</span>
            </div>
            <div class="news-category">{{ news.category || '综合' }}</div>
          </div>
          
          <div class="news-content-inner">
            <h3 class="news-title">{{ news.title }}</h3>
            <p class="news-summary">{{ news.summary }}</p>
            
            <div class="news-meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {{ formatTime(news.createdAt) }}
              </span>
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {{ news.author || '匿名' }}
              </span>
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {{ news.views || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="pagination-btn" 
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      
      <div class="pagination-info">
        <span>第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
      </div>
      
      <button 
        class="pagination-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <!-- 新闻详情对话框 -->
    <el-dialog 
      v-model="detailDialogVisible" 
      title="新闻详情" 
      width="800px"
      class="news-detail-dialog"
    >
      <div v-if="selectedNews" class="news-detail-content">
        <div class="detail-header">
          <h2 class="detail-title">{{ selectedNews.title }}</h2>
          <div class="detail-meta">
            <span class="detail-category">{{ selectedNews.category || '综合' }}</span>
            <span class="detail-time">{{ formatTime(selectedNews.createdAt) }}</span>
          </div>
        </div>
        
        <div class="detail-body">
          <p class="detail-summary">{{ selectedNews.summary }}</p>
          <div class="detail-content-text">
            {{ selectedNews.content }}
          </div>
        </div>
        
        <div class="detail-footer">
          <button class="action-btn-outline" @click="processNews(selectedNews)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            处理此新闻
          </button>
          <button class="action-btn-outline" @click="shareNews(selectedNews)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            分享
          </button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedSort = ref('latest')
const currentPage = ref(1)
const totalPages = ref(1)
const detailDialogVisible = ref(false)
const selectedNews = ref(null)

// 分类列表
const categories = ref([
  '时事政治',
  '经济财经',
  '科技前沿',
  '社会民生',
  '文化娱乐',
  '体育健康',
  '国际新闻'
])

// 模拟新闻数据
const newsList = ref([
  {
    id: 1,
    title: '人工智能技术突破新里程碑，大模型应用前景广阔',
    summary: '近期，人工智能技术取得重大突破，多个大语言模型在性能测试中展现出前所未有的能力，为各行各业带来了新的发展机遇。',
    content: '近期，人工智能技术取得重大突破，多个大语言模型在性能测试中展现出前所未有的能力。研究人员发现，这些模型在自然语言理解、逻辑推理、多模态处理等方面都有显著提升。专家表示，这将为医疗、教育、金融等行业带来革命性变化，同时也对数据安全、隐私保护提出了新的挑战。政府相关部门正在制定相关法规，确保AI技术的健康发展。',
    category: '科技前沿',
    author: '科技日报',
    views: 1250,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    title: '全球经济复苏态势良好，中国经济增长引领亚洲',
    summary: '最新经济数据显示，全球经济持续复苏，主要经济体表现超出预期。中国经济稳中向好，为地区和全球经济增长贡献重要力量。',
    content: '最新经济数据显示，全球经济持续复苏态势良好，主要经济体表现超出预期。中国经济稳中向好，一季度GDP同比增长4.5%，消费、投资、出口"三驾马车"协同发力，为地区和全球经济增长贡献重要力量。经济学家认为，随着各项政策措施的持续发力，全年经济增长预期有望实现。',
    category: '经济财经',
    author: '财经周刊',
    views: 890,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    title: '教育改革深入推进，数字化转型助力教育现代化',
    summary: '全国教育工作会议提出，要深入推进教育数字化转型，建设高质量教育体系，促进教育公平，培养新时代人才。',
    content: '全国教育工作会议近日召开，会议强调要深入推进教育数字化转型，建设高质量教育体系。各地将加大教育投入，完善数字化基础设施，推广智慧教育应用。同时，要深化教育改革，减轻学生负担，推进素质教育，培养德智体美劳全面发展的社会主义建设者和接班人。',
    category: '社会民生',
    author: '教育报',
    views: 678,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 4,
    title: '体育事业蓬勃发展，全民健身活动丰富多彩',
    summary: '全国体育工作会议提出，要大力发展体育事业，广泛开展全民健身活动，提高国民身体素质，为健康中国建设贡献力量。',
    content: '全国体育工作会议指出，要大力发展体育事业，广泛开展全民健身活动。各地将加强体育设施建设，完善全民健身服务体系，举办丰富多彩的体育赛事。同时，要重视青少年体育工作，培养优秀体育人才，为体育强国建设奠定坚实基础。',
    category: '体育健康',
    author: '体育报',
    views: 543,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 5,
    title: '文化传承创新取得新进展，传统文化焕发时代活力',
    summary：'文化工作会议强调，要推动中华优秀传统文化创造性转化、创新性发展，让传统文化在新时代焕发新的生机与活力。',
    content: '文化工作会议强调，要推动中华优秀传统文化创造性转化、创新性发展。各地将加强文化遗产保护传承，发展文化创意产业，推动文化旅游融合。同时，要讲好中国故事，传播好中国声音，提升中华文化国际影响力，为文化强国建设贡献力量。',
    category: '文化娱乐',
    author: '文化报',
    views: 432,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 6,
    title: '国际局势复杂多变，中国推动构建人类命运共同体',
    summary: '外交部发言人表示，当前国际形势复杂多变，中国将继续坚持和平发展道路，推动构建人类命运共同体，为世界和平与发展作出更大贡献。',
    content: '外交部发言人表示，当前国际形势复杂多变，中国将继续坚持和平发展道路，推动构建人类命运共同体。中方将积极参与全球治理，推动国际秩序朝着更加公正合理的方向发展。同时，要深化与各国的友好合作，共同应对全球性挑战，为世界和平与发展作出更大贡献。',
    category: '国际新闻',
    author: '新华社',
    views: 1567,
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  }
])

// 过滤后的新闻
const filteredNews = computed(() => {
  let result = [...newsList.value]
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(news => 
      news.title.toLowerCase().includes(query) ||
      news.summary.toLowerCase().includes(query) ||
      news.content.toLowerCase().includes(query)
    )
  }
  
  // 分类过滤
  if (selectedCategory.value) {
    result = result.filter(news => news.category === selectedCategory.value)
  }
  
  // 排序
  switch (selectedSort.value) {
    case 'latest':
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      break
    case 'popular':
      result.sort((a, b) => b.views - a.views)
      break
    case 'trending':
      // 热度计算：浏览量 * 时间衰减因子
      const now = Date.now()
      result.sort((a, b) => {
        const aAge = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24) // 天数
        const bAge = (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        const aScore = a.views / Math.exp(aAge * 0.1)
        const bScore = b.views / Math.exp(bAge * 0.1)
        return bScore - aScore
      })
      break
  }
  
  // 分页
  totalPages.value = Math.max(1, Math.ceil(result.length / 6))
  const start = (currentPage.value - 1) * 6
  const end = start + 6
  return result.slice(start, end)
})

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
}

// 格式化时间
const formatTime = (timeStr) => {
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now - time
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return time.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

// 查看新闻详情
const viewNewsDetail = (news) => {
  selectedNews.value = news
  detailDialogVisible.value = true
}

// 处理新闻
const processNews = (news) => {
  detailDialogVisible.value = false
  router.push({
    path: '/dashboard/process',
    query: { newsId: news.id }
  })
}

// 分享新闻
const shareNews = (news) => {
  const shareText = `${news.title}\n\n${news.summary}\n\n来源：CQUNews智能新闻系统`
  
  if (navigator.share) {
    navigator.share({
      title: news.title,
      text: shareText
    }).catch(() => {})
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      ElMessage.success('新闻内容已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  }
}

// 初始化数据
onMounted(() => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
  }, 500)
})
</script>

<style scoped>
.news-browse-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.header-content {
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
}

/* 搜索区域 */
.search-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 300px;
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.search-box:focus-within {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  padding: 0 16px;
  display: flex;
  align-items: center;
  color: #8c8c8c;
}

.search-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 8px;
  font-size: 14px;
  outline: none;
}

.search-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.search-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.filter-options {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 0 16px;
  height: 48px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:hover {
  border-color: #667eea;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 新闻内容 */
.news-content {
  min-height: 400px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #8c8c8c;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 新闻网格 */
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
}

.news-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
}

.news-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.news-image {
  position: relative;
  height: 180px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder {
  font-size: 48px;
  opacity: 0.5;
}

.news-category {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.news-content-inner {
  padding: 20px;
}

.news-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-summary {
  margin: 0 0 16px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #8c8c8c;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.pagination-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e8e8e8;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

/* 对话框样式 */
:deep(.news-detail-dialog) {
  border-radius: 16px;
}

:deep(.news-detail-dialog .el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.news-detail-dialog .el-dialog__body) {
  padding: 0;
}

:deep(.news-detail-dialog .el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.news-detail-content {
  padding: 24px;
}

.detail-header {
  margin-bottom: 24px;
}

.detail-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #8c8c8c;
}

.detail-category {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-body {
  margin-bottom: 24px;
}

.detail-summary {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.8;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  border-radius: 0 8px 8px 0;
}

.detail-content-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  white-space: pre-wrap;
}

.detail-footer {
  display: flex;
  gap: 12px;
}

.action-btn-outline {
  flex: 1;
  padding: 12px 24px;
  border: 1px solid #667eea;
  background: white;
  color: #667eea;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.action-btn-outline:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.action-btn-outline svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .news-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  
  .search-section {
    flex-direction: column;
  }
  
  .filter-options {
    width: 100%;
  }
  
  .filter-select {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 24px 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .news-grid {
    grid-template-columns: 1fr;
  }
  
  .news-card {
    border-radius: 12px;
  }
  
  .news-image {
    height: 160px;
  }
  
  .pagination {
    gap: 8px;
  }
  
  .pagination-info {
    font-size: 12px;
  }
}
</style>