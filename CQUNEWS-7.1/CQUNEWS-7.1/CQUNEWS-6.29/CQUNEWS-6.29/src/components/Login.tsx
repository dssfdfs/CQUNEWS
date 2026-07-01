import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Sparkles, Mail, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getCaptcha, login } from '@/api/deepseek';

export function Login() {
  const { settings, loadSettings } = useStore();
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [sessionKey, setSessionKey] = useState('');
  
  const navigate = useNavigate();
  const loginStore = useStore((state) => state.login);

  const loadCaptcha = async () => {
    try {
      const result = await getCaptcha();
      setCaptchaCode(result.captcha);
      setSessionKey(result.session_key);
      setCaptcha('');
    } catch (err) {
      console.error('Failed to load captcha:', err);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('请填写用户名和密码');
      return;
    }

    if (!captcha) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(username, password, captcha, sessionKey);
      const userInfo = {
        id: result.user_id.toString(),
        username,
        email: '',
        avatar: '',
        bio: '',
        role: result.role,
      };
      await loginStore(username, password, userInfo);
      localStorage.setItem('token', result.access_token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败');
      loadCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      settings?.theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-primary-50 via-white to-blue-50'
    }`}>
      <div className="w-full max-w-md">
        <div className={`rounded-2xl shadow-xl p-8 ${
          settings?.theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}>
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              settings?.theme === 'dark' ? 'bg-gray-700' : 'bg-primary-100'
            }`}>
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className={`text-2xl font-bold ${
              settings?.theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>AI 新闻助手</h1>
            <p className={`mt-2 ${
              settings?.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>智能新闻摘要与标题生成平台</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                settings?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>用户名</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                    settings?.theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-500' 
                      : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                settings?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className={`w-full pl-12 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                    settings?.theme === 'dark' 
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-500' 
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                settings?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>验证码</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    placeholder="请输入验证码"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${
                      settings?.theme === 'dark' 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-500' 
                        : 'border-gray-300'
                    }`}
                    maxLength={4}
                  />
                </div>
                <div className="relative">
                  <div className={`flex items-center justify-center w-32 h-12 rounded-lg border ${
                    settings?.theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600' 
                      : 'bg-gray-100 border-gray-300'
                  }`}>
                    <span className={`text-lg font-mono font-bold tracking-wider ${
                      settings?.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>{captchaCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className={`flex items-center gap-2 text-sm ${
                settings?.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                记住我
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                忘记密码？
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className={`text-sm ${
              settings?.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              还没有账号？{' '}
              <Link to="/register" className="text-primary-500 font-medium hover:text-primary-400">
                立即注册
              </Link>
            </p>
          </div>

          <div className={`mt-8 pt-6 border-t ${
            settings?.theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${
                settings?.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>或使用以下方式登录</span>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <button className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                settings?.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                settings?.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#1DA1F2" d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </button>
              <button className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                settings?.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#0077B5" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <p className={`text-center text-sm mt-6 ${
          settings?.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          © 2024 AI 新闻助手. 保留所有权利.
        </p>
      </div>
    </div>
  );
}