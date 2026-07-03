<template>
  <div class="settings-container">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">设置中心</h1>
        <p class="page-subtitle">管理系统偏好和个性化配置</p>
      </div>
    </div>

    <div class="settings-content">
      <!-- 设置分组 -->
      <div class="settings-grid">
        <!-- 用户设置 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon user-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">用户设置</h3>
              <p class="card-subtitle">管理账户信息和偏好</p>
            </div>
          </div>
          <div class="card-body">
            <div class="setting-item">
              <label class="setting-label">用户名</label>
              <el-input v-model="userSettings.username" placeholder="请输入用户名" class="setting-input" />
            </div>
            <div class="setting-item">
              <label class="setting-label">邮箱地址</label>
              <el-input v-model="userSettings.email" placeholder="请输入邮箱地址" class="setting-input" />
            </div>
            <div class="setting-item">
              <label class="setting-label">显示语言</label>
              <el-select v-model="userSettings.language" class="setting-select">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
                <el-option label="日本語" value="ja-JP" />
              </el-select>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn-primary" @click="saveUserSettings">保存用户设置</button>
          </div>
        </div>

        <!-- 系统设置 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon system-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">系统设置</h3>
              <p class="card-subtitle">配置系统行为和功能</p>
            </div>
          </div>
          <div class="card-body">
            <div class="setting-item">
              <label class="setting-label">主题风格</label>
              <el-select v-model="systemSettings.theme" class="setting-select">
                <el-option label="跟随系统" value="system" />
                <el-option label="浅色模式" value="light" />
                <el-option label="深色模式" value="dark" />
              </el-select>
            </div>
            <div class="setting-item">
              <label class="setting-label">界面缩放</label>
              <el-slider 
                v-model="systemSettings.scale" 
                :min="80" 
                :max="120" 
                :step="10"
                :marks="{ 80: '80%', 100: '100%', 120: '120%' }"
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">动画效果</label>
              <el-switch 
                v-model="systemSettings.animation" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
          </div>
          <div class="card-footer">
            <button class="btn-primary" @click="saveSystemSettings">保存系统设置</button>
          </div>
        </div>

        <!-- 通知设置 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon notification-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">通知设置</h3>
              <p class="card-subtitle">管理通知和提醒方式</p>
            </div>
          </div>
          <div class="card-body">
            <div class="setting-item">
              <label class="setting-label">桌面通知</label>
              <el-switch 
                v-model="notificationSettings.desktop" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">声音提醒</label>
              <el-switch 
                v-model="notificationSettings.sound" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">邮件通知</label>
              <el-switch 
                v-model="notificationSettings.email" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">通知频率</label>
              <el-select v-model="notificationSettings.frequency" class="setting-select">
                <el-option label="实时" value="realtime" />
                <el-option label="每小时" value="hourly" />
                <el-option label="每天" value="daily" />
                <el-option label="每周" value="weekly" />
              </el-select>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn-primary" @click="saveNotificationSettings">保存通知设置</button>
          </div>
        </div>

        <!-- 数据设置 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon data-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">数据设置</h3>
              <p class="card-subtitle">管理数据和存储空间</p>
            </div>
          </div>
          <div class="card-body">
            <div class="setting-item">
              <label class="setting-label">自动保存</label>
              <el-switch 
                v-model="dataSettings.autoSave" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">缓存清理</label>
              <div class="cache-info">
                <span class="cache-size">当前缓存: {{ cacheSize }}</span>
                <button class="btn-secondary" @click="clearCache">清理缓存</button>
              </div>
            </div>
            <div class="setting-item">
              <label class="setting-label">数据导出</label>
              <button class="btn-secondary" @click="exportData">导出数据</button>
            </div>
            <div class="setting-item">
              <label class="setting-label">数据备份</label>
              <button class="btn-secondary" @click="backupData">备份数据</button>
            </div>
          </div>
        </div>

        <!-- 安全设置 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon security-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">安全设置</h3>
              <p class="card-subtitle">账户安全和隐私保护</p>
            </div>
          </div>
          <div class="card-body">
            <div class="setting-item">
              <label class="setting-label">修改密码</label>
              <el-input 
                v-model="securitySettings.currentPassword" 
                type="password" 
                placeholder="当前密码" 
                class="setting-input"
                show-password
              />
            </div>
            <div class="setting-item">
              <el-input 
                v-model="securitySettings.newPassword" 
                type="password" 
                placeholder="新密码" 
                class="setting-input"
                show-password
              />
            </div>
            <div class="setting-item">
              <el-input 
                v-model="securitySettings.confirmPassword" 
                type="password" 
                placeholder="确认新密码" 
                class="setting-input"
                show-password
              />
            </div>
            <div class="setting-item">
              <label class="setting-label">两步验证</label>
              <el-switch 
                v-model="securitySettings.twoFactor" 
                active-text="启用" 
                inactive-text="禁用"
              />
            </div>
          </div>
          <div class="card-footer">
            <button class="btn-primary" @click="saveSecuritySettings">保存安全设置</button>
          </div>
        </div>

        <!-- 关于信息 -->
        <div class="settings-card">
          <div class="card-header">
            <div class="card-icon about-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">关于系统</h3>
              <p class="card-subtitle">版本信息和系统详情</p>
            </div>
          </div>
          <div class="card-body">
            <div class="about-info">
              <div class="info-item">
                <span class="info-label">系统名称:</span>
                <span class="info-value">CQUNews 智能新闻系统</span>
              </div>
              <div class="info-item">
                <span class="info-label">当前版本:</span>
                <span class="info-value">v1.0.0</span>
              </div>
              <div class="info-item">
                <span class="info-label">更新时间:</span>
                <span class="info-value">2025-06-29</span>
              </div>
              <div class="info-item">
                <span class="info-label">技术支持:</span>
                <span class="info-value">重庆大学智能信息处理实验室</span>
              </div>
            </div>
            <div class="about-actions">
              <button class="btn-secondary" @click="checkUpdate">检查更新</button>
              <button class="btn-secondary" @click="viewHelp">使用帮助</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 用户设置
const userSettings = ref({
  username: localStorage.getItem('username') || '用户',
  email: '',
  language: 'zh-CN'
})

// 系统设置
const systemSettings = ref({
  theme: 'system',
  scale: 100,
  animation: true
})

// 通知设置
const notificationSettings = ref({
  desktop: true,
  sound: false,
  email: false,
  frequency: 'daily'
})

// 数据设置
const dataSettings = ref({
  autoSave: true
})

const cacheSize = ref('24.5 MB')

// 安全设置
const securitySettings = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactor: false
})

// 加载设置
onMounted(() => {
  loadSettings()
})

const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      Object.assign(userSettings.value, settings.user || {})
      Object.assign(systemSettings.value, settings.system || {})
      Object.assign(notificationSettings.value, settings.notification || {})
      Object.assign(dataSettings.value, settings.data || {})
      Object.assign(securitySettings.value, settings.security || {})
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存用户设置
const saveUserSettings = () => {
  ElMessage.success('用户设置保存成功')
  saveAllSettings()
}

// 保存系统设置
const saveSystemSettings = () => {
  ElMessage.success('系统设置保存成功')
  saveAllSettings()
}

// 保存通知设置
const saveNotificationSettings = () => {
  ElMessage.success('通知设置保存成功')
  saveAllSettings()
}

// 保存安全设置
const saveSecuritySettings = () => {
  if (securitySettings.value.newPassword !== securitySettings.value.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  
  if (securitySettings.value.newPassword && securitySettings.value.newPassword.length < 6) {
    ElMessage.error('密码长度不能少于6位')
    return
  }
  
  ElMessage.success('安全设置保存成功')
  saveAllSettings()
}

// 保存所有设置
const saveAllSettings = () => {
  const settings = {
    user: userSettings.value,
    system: systemSettings.value,
    notification: notificationSettings.value,
    data: dataSettings.value,
    security: securitySettings.value
  }
  localStorage.setItem('userSettings', JSON.stringify(settings))
}

// 清理缓存
const clearCache = () => {
  ElMessageBox.confirm(
    '确定要清理所有缓存数据吗？此操作不可撤销。',
    '清理缓存',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 模拟清理缓存
    setTimeout(() => {
      cacheSize.value = '0 MB'
      ElMessage.success('缓存清理成功')
    }, 500)
  }).catch(() => {
    // 用户取消
  })
}

// 导出数据
const exportData = () => {
  ElMessageBox.confirm(
    '确定要导出所有数据吗？',
    '导出数据',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    ElMessage.success('数据导出成功')
  }).catch(() => {
    // 用户取消
  })
}

// 备份数据
const backupData = () => {
  ElMessageBox.confirm(
    '确定要备份数据吗？',
    '备份数据',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    ElMessage.success('数据备份成功')
  }).catch(() => {
    // 用户取消
  })
}

// 检查更新
const checkUpdate = () => {
  ElMessage.info('当前已是最新版本')
}

// 使用帮助
const viewHelp = () => {
  ElMessage.info('帮助文档正在建设中...')
}
</script>

<style scoped>
.settings-container {
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
  text-align: center;
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

/* 设置内容 */
.settings-content {
  padding: 0 24px 24px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

/* 设置卡片 */
.settings-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e8e8e8;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.system-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.notification-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.data-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.security-icon {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: white;
}

.about-icon {
  background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
  color: white;
}

.card-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.card-subtitle {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
}

.card-body {
  padding: 24px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.setting-input,
.setting-select {
  width: 100%;
}

:deep(.setting-input .el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e8e8e8 inset;
  transition: all 0.3s ease;
}

:deep(.setting-input .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #667eea inset;
}

:deep(.setting-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #667eea inset, 0 0 0 3px rgba(102, 126, 234, 0.1);
}

:deep(.setting-select) {
  width: 100%;
}

.cache-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.cache-size {
  font-size: 14px;
  color: #666;
}

.card-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

/* 按钮样式 */
.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 100%;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-secondary:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

/* 关于信息 */
.about-info {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #333;
  font-weight: 600;
}

.about-actions {
  display: flex;
  gap: 12px;
}

.about-actions .btn-secondary {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .settings-content {
    padding: 0 16px 16px;
  }
  
  .page-header {
    padding: 24px 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .settings-card {
    border-radius: 12px;
  }
  
  .card-header {
    padding: 16px;
  }
  
  .card-body {
    padding: 16px;
  }
  
  .card-footer {
    padding: 12px 16px;
  }
  
  .card-icon {
    width: 40px;
    height: 40px;
  }
  
  .card-icon svg {
    width: 20px;
    height: 20px;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .about-actions {
    flex-direction: column;
  }
}

/* 开关样式 */
:deep(.el-switch) {
  height: 24px;
}

:deep(.el-switch__label) {
  height: 24px;
  line-height: 24px;
  font-size: 14px;
}

/* 滑块样式 */
:deep(.el-slider__runway) {
  height: 6px;
}

:deep(.el-slider__button) {
  width: 18px;
  height: 18px;
  border: 2px solid #667eea;
}

:deep(.el-slider__bar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>