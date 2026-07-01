import { Home, FileText, History, BarChart3, Settings, LogOut, Sparkles, User } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const { logout, currentUser } = useStore();
  
  const navItems = [
    { id: 'home', label: '首页', icon: Home },
    { id: 'summary', label: '新闻摘要与标题生成', icon: FileText },
    { id: 'news', label: '今日新闻速览', icon: Sparkles },
    { id: 'history', label: '个人历史', icon: History },
    { id: 'analytics', label: '数据分析', icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary-600" />
          AI新闻助手
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
              <span className="font-medium">{item.label}</span>
            </div>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <div className="font-medium text-gray-800">{currentUser?.username || '用户'}</div>
            <div className="text-xs text-gray-400">{currentUser?.email}</div>
          </div>
        </div>
        
        <div
          onClick={() => onItemClick('settings')}
          className={`nav-item ${activeItem === 'settings' ? 'active' : ''}`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">设置中心</span>
        </div>
        
        <div
          onClick={handleLogout}
          className="nav-item text-red-500 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">退出登录</span>
        </div>
      </div>
    </div>
  );
}