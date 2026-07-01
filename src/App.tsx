import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicRoute } from '@/components/PublicRoute';
import { Login } from '@/components/Login';
import { Register } from '@/components/Register';
import { HomePage } from '@/components/HomePage';
import { ContentInput } from '@/components/ContentInput';
import { SummaryOutput } from '@/components/SummaryOutput';
import { TitleOutput } from '@/components/TitleOutput';
import { QualityVerification } from '@/components/QualityVerification';
import { NewsPreview } from '@/components/NewsPreview';
import { History } from '@/components/History';
import { Analytics } from '@/components/Analytics';
import { Settings } from '@/components/Settings';
import { useStore } from '@/store/useStore';
import { generateSummary, generateTitles, verifyQuality } from '@/api/deepseek';

function Dashboard() {
  const { step, setStep, content, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs } = useStore();
  const [activeNav, setActiveNav] = useState('summary');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleGenerateAll = async () => {
      if (!content.trim()) return;
      
      setError('');
      setIsGenerating(true);
      
      const apiConfig = apiConfigs[model];
      
      try {
        setStep(2);
        const summary = await generateSummary(content, '标准摘要', '中文', apiConfig);
        setSummary(summary);
        
        setStep(3);
        const titles = await generateTitles(content, '中文', apiConfig);
        setTitles(titles);
        
        setStep(4);
        const quality = await verifyQuality(content, summary, titles, apiConfig);
        setQuality(quality);
        
        setStep(5);
        addHistory({ content, summary, titles });
        
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
  }, [content, setStep, setSummary, setTitles, setQuality, setIsGenerating, addHistory, model, apiConfigs]);

  const handleNavClick = (item: string) => {
    setActiveNav(item);
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'home':
        return <HomePage />;
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
          </div>
        );
      case 'news':
        return <NewsPreview />;
      case 'history':
        return <History />;
      case 'analytics':
        return <Analytics />;
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
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeItem={activeNav} onItemClick={handleNavClick} />
      
      <div className="flex-1 overflow-y-auto">
        {activeNav === 'summary' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'
                  }`}>1</div>
                  <span>内容输入</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'
                  }`}>2</div>
                  <span>摘要生成</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 3 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'
                  }`}>3</div>
                  <span>标题生成</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 4 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 4 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'
                  }`}>4</div>
                  <span>质量验证</span>
                </div>
                <div className={`w-16 h-0.5 ${step >= 5 ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  step >= 5 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step >= 5 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-500'
                  }`}>5</div>
                  <span>完成导出</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeNav === 'home' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800">AI 新闻助手</h1>
            </div>
          </div>
        )}
        
        {activeNav === 'news' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800">今日新闻速览</h1>
            </div>
          </div>
        )}
        
        {activeNav === 'history' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800">个人历史</h1>
            </div>
          </div>
        )}
        
        {activeNav === 'analytics' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800">数据分析</h1>
            </div>
          </div>
        )}
        
        {activeNav === 'settings' && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-gray-800">设置中心</h1>
            </div>
          </div>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
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
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;