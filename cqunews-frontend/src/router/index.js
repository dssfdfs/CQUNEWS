import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    children: [
      {
        path: 'process',
        name: 'Process',
        component: () => import('../views/Process.vue')
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('../views/History.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  // 允许访问登录和注册页面
  if (to.path === '/login' || to.path === '/register') {
    // 如果已登录，跳转到首页
    if (token && to.path === '/login') {
      next('/dashboard/process')
    } else {
      next()
    }
  } else {
    // 其他页面需要登录
    if (token) {
      next()
    } else {
      next('/login')
    }
  }
})

export default router
