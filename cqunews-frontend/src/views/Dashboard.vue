<template>
  <div class="dashboard-container">
    <aside class="sidebar">
      <div class="logo">
        <h2>CQUNews</h2>
        <p>智能新闻处理</p>
      </div>
      <el-menu :default-active="activeMenu" router>
        <el-menu-item index="/dashboard/process">
          <el-icon><EditPen /></el-icon>
          <span>新闻处理</span>
        </el-menu-item>
        <el-menu-item index="/dashboard/history">
          <el-icon><Clock /></el-icon>
          <span>历史记录</span>
        </el-menu-item>
      </el-menu>
    </aside>
    <main class="main-content">
      <header class="header">
        <span class="title">{{ currentTitle }}</span>
        <div class="user-info">
          <span>{{ username }}</span>
          <el-button type="text" @click="handleLogout">退出登录</el-button>
        </div>
      </header>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { EditPen, Clock } from '@element-plus/icons-vue'
import { logout } from '../api/auth'

const router = useRouter()
const route = useRoute()

const username = ref(localStorage.getItem('username') || '')

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  const titles = {
    '/dashboard/process': '新闻内容智能摘要与标题生成',
    '/dashboard/history': '历史任务记录'
  }
  return titles[route.path] || '首页'
})

const handleLogout = async () => {
  try {
    await logout()
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    ElMessage.success('退出成功')
    router.push('/login')
  } catch (error) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    router.push('/login')
  }
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px 0;
}

.logo {
  text-align: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
}

.logo h2 {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
}

.logo p {
  margin: 5px 0 0;
  font-size: 12px;
  opacity: 0.7;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header .title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info span {
  color: #666;
}
</style>
