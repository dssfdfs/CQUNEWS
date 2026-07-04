import { FileText, History, Settings, LogOut, Sparkles, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getTranslation } from '@/lib/i18n';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const { logout, currentUser, settings } = useStore();
  
  const t = (key: string) => getTranslation(key, settings.language);
  
  const navItems = [
    { id: 'news', labelKey: 'news_quick_view', icon: Sparkles },
    { id: 'summary', labelKey: 'news_summary_title', icon: FileText },
    { id: 'history', labelKey: 'personal_history', icon: History },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 h-screen border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary-600" />
          {t('ai_news_assistant')}
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{t(item.labelKey)}</span>
            </div>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-medium text-gray-800 dark:text-gray-100">{currentUser?.username || t('user')}</div>
            <div className="text-xs text-gray-400">{currentUser?.email}</div>
          </div>
        </div>
        
        <div
          onClick={() => onItemClick('settings')}
          className={`nav-item ${activeItem === 'settings' ? 'active' : ''}`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">{t('settings_center')}</span>
        </div>
        
        <div
          onClick={handleLogout}
          className="nav-item text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('logout')}</span>
        </div>
      </div>
    </div>
  );
}