import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getTranslation } from '@/lib/i18n';
import { Mail, Lock, Eye, EyeOff, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const settingsStr = localStorage.getItem('settings');
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        const body = document.body;
        body.classList.remove('light', 'dark');
        if (settings.theme === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          body.classList.add(systemDark ? 'dark' : 'light');
        } else {
          body.classList.add(settings.theme || 'light');
        }
        document.documentElement.style.fontSize = `${settings.fontSize || 14}px`;
      } catch {
        document.body.classList.add('light');
      }
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const settingsStr = localStorage.getItem('settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : { language: 'zh' };
  const t = (key: string) => getTranslation(key, settings.language);

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/forgot-password/send-code', { email });
      if (response.success) {
        setMessage(response.message);
        if (response.code) {
          setMessage(`${response.message}（验证码：${response.code}）`);
        }
        setStep(2);
        setCountdown(60);
      } else {
        setError(response.message || '发送失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '发送失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/forgot-password/verify-code', { email, code });
      if (response.success) {
        setMessage(response.message);
        setStep(3);
      } else {
        setError(response.message || '验证失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '验证码无效或已过期');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/forgot-password/reset', { email, code, new_password: newPassword });
      if (response.success) {
        setMessage(response.message);
        setStep(4);
      } else {
        setError(response.message || '重置失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '重置失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const renderStep1 = () => (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('forgot_password')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">输入您的注册邮箱，我们将发送验证码给您</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱地址</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的注册邮箱"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <button
          onClick={handleSendCode}
          disabled={isLoading}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              发送中...
            </span>
          ) : (
            '发送验证码'
          )}
        </button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
            返回登录
          </Link>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">验证身份</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">请输入发送到 {email} 的验证码</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">验证码</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入6位验证码"
              maxLength={6}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              onClick={handleSendCode}
              disabled={countdown > 0 || isLoading}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {countdown > 0 ? `${countdown}s` : '重新发送'}
            </button>
          </div>
        </div>

        <button
          onClick={handleVerifyCode}
          disabled={isLoading}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              验证中...
            </span>
          ) : (
            '验证验证码'
          )}
        </button>

        <div className="text-center">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
            返回修改邮箱
          </button>
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">设置新密码</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">请输入您的新密码</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新密码</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码"
              className="w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">确认密码</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        <button
          onClick={handleResetPassword}
          disabled={isLoading}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              重置中...
            </span>
          ) : (
            '重置密码'
          )}
        </button>

        <div className="text-center">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">
            返回重新开始
          </button>
        </div>
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">密码重置成功</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">您的密码已成功更新，请使用新密码登录</p>
      </div>

      <div className="space-y-6">
        <button
          onClick={handleBackToLogin}
          className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all"
        >
          返回登录
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 AI 新闻助手. 保留所有权利.
        </p>
      </div>
    </div>
  );
}