import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { ContentInput } from '@/components/ContentInput';
import { SummaryOutput } from '@/components/SummaryOutput';
import { TitleOutput } from '@/components/TitleOutput';
import { QualityVerification } from '@/components/QualityVerification';
import { NewsPreview } from '@/components/NewsPreview';
import { NewsRecommend } from '@/components/NewsRecommend';
import { NewsDetail } from '@/components/NewsDetail';

import { History } from '@/components/History';
import { Settings } from '@/components/Settings';
import { Toast } from '@/components/Toast';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminUserManagement } from '@/pages/AdminUserManagement';
import { AdminFeedbackManagement } from '@/pages/AdminFeedbackManagement';
import { AdminSettings } from '@/pages/AdminSettings';
import { ContentModerationPage } from '@/pages/ContentModerationPage';
import { LogsPage } from '@/pages/LogsPage';
import { useStore } from '@/store/useStore';
import { useAdminStore } from '@/store/adminStore';
import { generateSummary, generateTitles, verifyQuality } from '@/api/deepseek';
import { userApi } from '@/lib/api';
import { getTranslation } from '@/lib/i18n';

function Dashboard() {
  const { step, setStep, content, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs, customPrompt, summaryType, language, settings } = useStore();
  const [activeNav, setActiveNav] = useState('news');
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const page = pathParts[1] || 'news';
    if (['news', 'summary', 'history', 'settings'].includes(page)) {
      setActiveNav(page);
    }
  }, [location.pathname]);

  useEffect(() => {
    const body = document.body;
    body.classList.remove('light', 'dark');
    
    if (settings.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(systemDark ? 'dark' : 'light');
    } else {
      body.classList.add(settings.theme || 'light');
    }
    
    document.documentElement.style.fontSize = `${settings.fontSize || 14}px`;
  }, [settings.theme, settings.fontSize]);

  useEffect(() => {
    const handleGenerateAll = async () => {
      if (!content.trim()) return;
      
      setError('');
      setIsGenerating(true);
      
      const apiConfig = apiConfigs[model];
      
      try {
        setStep(2);
        const summary = await generateSummary(content, summaryType, language, apiConfig, customPrompt);
        setSummary(summary);
        
        setStep(3);
        const titles = await generateTitles(content, language, apiConfig, customPrompt);
        setTitles(titles);
        
        setStep(4);
        const quality = await verifyQuality(content, summary, titles, apiConfig);
        setQuality(quality);
        
        setStep(5);
        addHistory({ content, summary, titles });
        userApi.recordBehavior('generate', undefined, { content_length: content.length }).catch(() => {});
        
      } catch (err) {
        console.error(err);
        setError('生成失败，请稍后重试');
      } finally {
        setIsGenerating(false);
      }
    };

    const handleNavigateToSummary = () => {
      setActiveNav('summary');
    };

    window.addEventListener('generate-all', handleGenerateAll);
    window.addEventListener('navigate-to-summary', handleNavigateToSummary);
    return () => {
      window.removeEventListener('generate-all', handleGenerateAll);
      window.removeEventListener('navigate-to-summary', handleNavigateToSummary);
    };
  }, [content, setStep, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs, customPrompt, summaryType, language]);

  const handleNavClick = (item: string) => {
    setActiveNav(item);
    navigate(`/${item}`);
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'summary':
        return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <ContentInput />
            <SummaryOutput />
            <TitleOutput />
            <QualityVerification />
            <NewsRecommend />
          </div>
        );
      case 'news':
        return <NewsPreview />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <ContentInput />
            <SummaryOutput />
            <TitleOutput />
            <QualityVerification />
            <NewsRecommend />
          </div>
        );
    }
  };

  const t = (key: string) => getTranslation(key, settings.language);
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeItem={activeNav} onItemClick={handleNavClick} />
      
      <div className="flex-1 overflow-y-auto">
        {activeNav === 'summary' && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                  }`}>1</div>
                  <span>{t('content_input')}</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                  }`}>2</div>
                  <span>{t('summary_generation')}</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 3 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                  }`}>3</div>
                  <span>{t('title_generation')}</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 4 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 4 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                  }`}>4</div>
                  <span>{t('quality_verification')}</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 5 ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 5 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 5 ? 'bg-primary-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                  }`}>5</div>
                  <span>{t('complete_export')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeNav === 'news' && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('news_quick_view')}</h1>
            </div>
          </div>
        )}
        
        {activeNav === 'history' && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('personal_history')}</h1>
            </div>
          </div>
        )}
        
        
        
        {activeNav === 'settings' && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('settings_center')}</h1>
            </div>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
}

function AdminApp() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const page = pathParts[2] || 'dashboard';
    if (['dashboard', 'users', 'content', 'feedback', 'logs', 'settings'].includes(page)) {
      setActiveItem(page);
    }
  }, [location.pathname]);

  const handleNavClick = (item: string) => {
    setActiveItem(item);
    navigate(`/admin/${item}`);
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return <AdminDashboard activeItem={activeItem} onItemClick={handleNavClick} />;
      case 'users':
        return <AdminUserManagement activeItem={activeItem} onItemClick={handleNavClick} />;
      case 'content':
        return <ContentModerationPage activeItem={activeItem} onItemClick={handleNavClick} />;
      case 'feedback':
        return <AdminFeedbackManagement activeItem={activeItem} onItemClick={handleNavClick} />;
      case 'logs':
        return <LogsPage activeItem={activeItem} onItemClick={handleNavClick} />;
      case 'settings':
        return <AdminSettings activeItem={activeItem} onItemClick={handleNavClick} />;
      default:
        return <AdminDashboard activeItem={activeItem} onItemClick={handleNavClick} />;
    }
  };

  return (
    <>
      {renderContent()}
      <Toast />
    </>
  );
}

function AppContent() {
  const setLogoutHandler = useAdminStore((state) => state.setLogoutHandler);
  const navigate = useNavigate();

  useEffect(() => {
    setLogoutHandler(() => {
      navigate('/login');
    });
  }, [setLogoutHandler, navigate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
          path="/news/:id"
          element={
            <ProtectedRoute>
              <NewsDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminApp />
            </AdminRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
