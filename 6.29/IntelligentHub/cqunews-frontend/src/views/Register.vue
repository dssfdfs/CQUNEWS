<template>
  <div class="register-page">
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

    <!-- 右侧注册表单区域 -->
    <div class="right-panel">
      <div class="register-container">
        <h2 class="register-title">用户注册</h2>
        <p class="register-subtitle">创建新账号，开启智能摘要之旅</p>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <!-- 成功提示 -->
        <div v-if="successMsg" class="success-message">
          {{ successMsg }}
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

          <!-- 确认密码输入框 -->
          <el-form-item label="" prop="confirmPassword">
            <div class="input-wrapper">
              <el-input 
                v-model="form.confirmPassword" 
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请确认密码"
                :prefix-icon="LockIcon"
              >
                <template #suffix>
                  <span class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
                    <component :is="showConfirmPassword ? EyeIcon : EyeOffIcon" />
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
                @keyup.enter="handleRegister"
              />
              <div class="verification-code" @click="fetchCode">
                <span v-for="(char, index) in verificationCode" :key="index" :style="{ transform: `rotate(${char.rotate}deg)` }">
                  {{ char.char }}
                </span>
              </div>
            </div>
          </el-form-item>

          <!-- 用户协议同意 -->
          <div class="agreement">
            <el-checkbox v-model="form.agree"></el-checkbox>
            <span class="agreement-text">
              我已阅读并同意
              <a href="#" @click.prevent="showAgreement('user')" class="link">《用户协议》</a>
              和
              <a href="#" @click.prevent="showAgreement('privacy')" class="link">《隐私政策》</a>
            </span>
          </div>

          <!-- 注册按钮 -->
          <el-form-item>
            <el-button 
              type="primary" 
              class="register-btn" 
              @click="handleRegister" 
              :loading="loading"
            >
              注册
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 登录链接 -->
        <div class="login-link">
          <span>已有账号？</span>
          <router-link to="/login" class="link">立即登录</router-link>
        </div>
      </div>
    </div>

    <!-- 用户协议/隐私政策弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <div class="agreement-content">
        <h3 v-if="dialogType === 'user'">用户协议</h3>
        <h3 v-else>隐私政策</h3>
        <p v-if="dialogType === 'user'">
          欢迎使用新闻内容摘要与标题生成系统。请在使用本系统前仔细阅读以下用户协议：<br><br>
          1. 接受条款<br>
          通过访问或使用本系统，您表示同意接受本协议的所有条款和条件。<br><br>
          2. 服务说明<br>
          本系统提供新闻内容智能摘要、标题生成、命名实体识别等功能。<br><br>
          3. 用户责任<br>
          用户应保证所输入的新闻内容不侵犯他人知识产权或其他合法权益。<br><br>
          4. 免责声明<br>
          系统生成的摘要和标题仅供参考，使用者需自行判断其准确性和适用性。<br><br>
          5. 知识产权<br>
          系统生成的内容版权归用户所有，但系统本身的技术和算法受相关法律保护。
        </p>
        <p v-else>
          隐私政策<br><br>
          我们重视您的隐私保护。以下是我们的隐私政策要点：<br><br>
          1. 信息收集<br>
          我们仅收集为您提供服务所必需的信息，包括账号信息和新闻处理记录。<br><br>
          2. 信息使用<br>
          您的信息将用于提供服务、改进产品质量和用户体验。<br><br>
          3. 信息保护<br>
          我们采取合理的安全措施保护您的个人信息，防止未经授权的访问或泄露。<br><br>
          4. 信息共享<br>
          未经您同意，我们不会与任何第三方分享您的个人信息。<br><br>
          5. Cookie使用<br>
          我们可能使用Cookie来改善用户体验，但不会用于追踪个人行为。
        </p>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
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
const successMsg = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogType = ref('')
const sessionId = ref('')

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
  confirmPassword: '',
  code: '',
  agree: false
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请确认密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

// 验证码
const verificationCode = ref([])

// 获取验证码
const fetchCode = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/auth/code')
    const res = await response.json()
    if (res.code === 200) {
      sessionId.value = res.data.sessionId
      generateCodeDisplay(res.data.code)
    }
  } catch (error) {
    console.error('获取验证码失败:', error)
  }
}

// 生成验证码显示
const generateCodeDisplay = (code) => {
  const chars = code.split('')
  verificationCode.value = chars.map(char => ({
    char: char,
    rotate: Math.random() * 60 - 30
  }))
}

// 显示用户协议或隐私政策
const showAgreement = (type) => {
  dialogType.value = type
  dialogTitle.value = type === 'user' ? '用户协议' : '隐私政策'
  dialogVisible.value = true
}

// 注册处理
const handleRegister = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      // 检查是否同意用户协议
      if (!form.agree) {
        errorMsg.value = '请阅读并同意用户协议和隐私政策'
        return
      }
      
      loading.value = true
      errorMsg.value = ''
      successMsg.value = ''
      
      try {
        const response = await fetch('http://localhost:8080/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            confirmPassword: form.confirmPassword,
            code: form.code,
            sessionId: sessionId.value
          })
        })
        
        const res = await response.json()
        
        if (res.code === 200) {
          successMsg.value = '已成功注册'
          ElMessage.success('注册成功！即将跳转到登录页面...')
          // 3秒后跳转到登录页面
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          errorMsg.value = res.message
          // 刷新验证码
          fetchCode()
          form.code = ''
        }
      } catch (error) {
        errorMsg.value = '注册失败，请检查网络连接'
        fetchCode()
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchCode()
})
</script>

<style scoped>
/* 页面整体布局 */
.register-page {
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

/* 右侧注册表单区域 */
.right-panel {
  width: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.register-container {
  width: 380px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
}

.register-title {
  font-size: 28px;
  color: #1e1e1e;
  text-align: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.register-subtitle {
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

/* 成功提示 */
.success-message {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
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

/* 用户协议 */
.agreement {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  font-size: 14px;
  color: #666;
}

.agreement-text {
  margin-left: 8px;
  line-height: 20px;
}

.link {
  color: #1971c2;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

/* 注册按钮 */
.register-btn {
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

.register-btn:hover {
  background: linear-gradient(135deg, #74c0fc 0%, #4dabf7 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(116, 192, 252, 0.4);
}

/* 登录链接 */
.login-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

/* 弹窗内容样式 */
.agreement-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 0 10px;
}

.agreement-content h3 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.agreement-content p {
  line-height: 1.8;
  color: #666;
  text-align: justify;
}
</style>
