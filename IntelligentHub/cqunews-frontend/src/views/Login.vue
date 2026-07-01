<template>
  <div class="login-page">
    <!-- 左侧装饰区域 -->
    <div class="left-panel">
      <h1 class="system-title">新闻内容摘要与标题生成系统</h1>
      <div class="decoration">
        <svg viewBox="0 0 200 200" class="decorative-icon">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
          <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
        </svg>
      </div>
    </div>

    <!-- 右侧登录表单区域 -->
    <div class="right-panel">
      <div class="login-container">
        <h2 class="login-title">用户登录</h2>
        <p class="login-subtitle">欢迎回来，请登录您的账号</p>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
          <!-- 用户名输入框 -->
          <el-form-item label="" prop="username">
            <div class="input-wrapper">
              <el-input 
                v-model="form.username" 
                placeholder="请输入用户名"
                :prefix-icon="UserIcon"
                clearable
              />
            </div>
          </el-form-item>

          <!-- 密码输入框 -->
          <el-form-item label="" prop="password">
            <div class="input-wrapper">
              <el-input 
                v-model="form.password" 
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                :prefix-icon="LockIcon"
              >
                <template #suffix>
                  <span class="password-toggle" @click="showPassword = !showPassword">
                    <component :is="showPassword ? EyeIcon : EyeOffIcon" />
                  </span>
                </template>
              </el-input>
            </div>
          </el-form-item>

          <!-- 验证码输入框 -->
          <el-form-item label="" prop="code">
            <div class="input-wrapper verification-wrapper">
              <el-input 
                v-model="form.code" 
                placeholder="请输入4位验证码"
                :prefix-icon="ShieldIcon"
                maxlength="4"
                @keyup.enter="handleLogin"
              />
              <div class="verification-code" @click="refreshCode">
                <span v-for="(char, index) in verificationCode" :key="index" :style="{ transform: `rotate(${char.rotate}deg)` }">
                  {{ char.char }}
                </span>
              </div>
            </div>
          </el-form-item>

          <!-- 记住我和忘记密码 -->
          <div class="form-options">
            <el-checkbox v-model="form.remember" label="记住我" />
            <span class="forgot-password">忘记密码？</span>
          </div>

          <!-- 登录按钮 -->
          <el-form-item>
            <el-button 
              type="primary" 
              class="login-btn" 
              @click="handleLogin" 
              :loading="loading"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 注册链接 -->
        <div class="register-link">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

// 简单的SVG图标组件
const UserIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none', 
      stroke: 'currentColor',
      'stroke-width': '2',
      style: { width: '18px', height: '18px' }
    }, [
      h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
      h('circle', { cx: '12', cy: '7', r: '4' })
    ])
  }
}

const LockIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none', 
      stroke: 'currentColor',
      'stroke-width': '2',
      style: { width: '18px', height: '18px' }
    }, [
      h('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
      h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })
    ])
  }
}

const ShieldIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none', 
      stroke: 'currentColor',
      'stroke-width': '2',
      style: { width: '18px', height: '18px' }
    }, [
      h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
    ])
  }
}

const EyeIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none', 
      stroke: 'currentColor',
      'stroke-width': '2',
      style: { width: '18px', height: '18px', cursor: 'pointer' }
    }, [
      h('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }),
      h('circle', { cx: '12', cy: '12', r: '3' })
    ])
  }
}

const EyeOffIcon = {
  render() {
    return h('svg', { 
      viewBox: '0 0 24 24', 
      fill: 'none', 
      stroke: 'currentColor',
      'stroke-width': '2',
      style: { width: '18px', height: '18px', cursor: 'pointer' }
    }, [
      h('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }),
      h('line', { x1: '1', y1: '1', x2: '23', y2: '23' })
    ])
  }
}

const form = reactive({
  username: '',
  password: '',
  code: '',
  remember: false
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

// 验证码
const verificationCode = ref([])

// 生成随机验证码
const generateCode = () => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const code = []
  for (let i = 0; i < 4; i++) {
    code.push({
      char: chars[Math.floor(Math.random() * chars.length)],
      rotate: Math.random() * 60 - 30
    })
  }
  verificationCode.value = code
}

// 刷新验证码
const refreshCode = () => {
  generateCode()
}

// 登录处理
const handleLogin = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      // 验证码校验
      const inputCode = form.code.toUpperCase()
      const correctCode = verificationCode.value.map(c => c.char).join('')
      
      if (inputCode !== correctCode) {
        errorMsg.value = '验证码错误，请重新输入！'
        refreshCode()
        return
      }
      
      loading.value = true
      errorMsg.value = ''
      
      try {
        const response = await fetch('http://localhost:8080/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            password: form.password
          })
        })
        
        const res = await response.json()
        
        if (res.code === 200) {
          localStorage.setItem('token', res.data.token)
          localStorage.setItem('username', res.data.username)
          ElMessage.success('登录成功')
          router.push('/dashboard/process')
        } else {
          errorMsg.value = res.message
          refreshCode()
        }
      } catch (error) {
        errorMsg.value = '登录失败，请检查网络连接'
        refreshCode()
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  generateCode()
})
</script>

<style scoped>
/* 页面整体布局 */
.login-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

/* 左侧装饰区域 */
.left-panel {
  flex: 1;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.system-title {
  color: white;
  font-size: 32px;
  font-weight: 600;
  text-align: center;
  padding: 0 40px;
  z-index: 1;
}

.decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
}

.decorative-icon {
  position: absolute;
  bottom: -50px;
  left: -50px;
  width: 400px;
  height: 400px;
  opacity: 0.5;
}

/* 右侧登录表单区域 */
.right-panel {
  width: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.login-container {
  width: 380px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 28px;
  color: #1e1e1e;
  text-align: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.login-subtitle {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin-bottom: 24px;
}

/* 错误提示 */
.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #f5222d;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

/* 输入框样式 */
.input-wrapper {
  width: 100%;
}

:deep(.el-input__wrapper) {
  padding: 12px 16px;
  border-radius: 8px;
}

:deep(.el-input__inner) {
  font-size: 14px;
}

/* 验证码输入框 */
.verification-wrapper {
  display: flex;
  gap: 12px;
}

.verification-wrapper .el-input {
  flex: 1;
}

.verification-code {
  width: 100px;
  height: 42px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
  padding: 0 8px;
}

.verification-code span {
  font-size: 22px;
  font-weight: bold;
  color: white;
  margin: 0 2px;
  font-style: italic;
}

/* 密码显示切换 */
.password-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #999;
}

.password-toggle:hover {
  color: #666;
}

/* 表单选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.forgot-password {
  color: #1971c2;
  font-size: 14px;
  cursor: pointer;
}

.forgot-password:hover {
  text-decoration: underline;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #a5d8ff 0%, #74c0fc 100%);
  border: none;
  color: #1e1e1e;
  font-weight: 500;
  transition: all 0.3s ease;
}

.login-btn:hover {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(116, 192, 252, 0.4);
}

/* 注册链接 */
.register-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

.link {
  color: #1971c2;
  text-decoration: none;
  margin-left: 4px;
}

.link:hover {
  text-decoration: underline;
}
</style>
