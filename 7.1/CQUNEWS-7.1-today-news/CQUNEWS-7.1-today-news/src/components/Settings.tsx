import { useState } from 'react';
import { User, Bell, Shield, Palette, Globe, Database, Save, RefreshCw, HelpCircle, ChevronRight, Info } from 'lucide-react';

interface SettingSection {
  id: string;
  title: string;
  icon: typeof User;
  description: string;
}

const sections: SettingSection[] = [
  { id: 'profile', title: '个人信息', icon: User, description: '管理您的个人资料和头像' },
  { id: 'notification', title: '通知设置', icon: Bell, description: '配置消息通知偏好' },
  { id: 'security', title: '安全设置', icon: Shield, description: '管理账户安全和隐私' },
  { id: 'appearance', title: '外观设置', icon: Palette, description: '自定义界面主题和字体' },
  { id: 'language', title: '语言设置', icon: Globe, description: '选择应用显示语言' },
  { id: 'storage', title: '数据管理', icon: Database, description: '管理本地数据和缓存' },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">用户头像</h3>
                <p className="text-gray-500 text-sm">支持 JPG、PNG 格式，大小不超过 2MB</p>
                <button className="btn-secondary mt-3">更换头像</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                <input type="text" defaultValue="admin" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
                <input type="email" defaultValue="admin@example.com" className="input-field" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
              <textarea className="input-field h-24 resize-none" placeholder="简单介绍一下自己..." />
            </div>
          </div>
        );

      case 'notification':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">邮件通知</h4>
                <p className="text-sm text-gray-500">当有新的处理结果时发送邮件通知</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">声音提示</h4>
                <p className="text-sm text-gray-500">处理完成时播放提示音</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800">摘要质量通知</h4>
                <p className="text-sm text-gray-500">当摘要质量低于阈值时通知</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">修改密码</h4>
              <div className="grid grid-cols-2 gap-4">
                <input type="password" placeholder="当前密码" className="input-field" />
                <input type="password" placeholder="新密码" className="input-field" />
                <input type="password" placeholder="确认新密码" className="input-field col-span-2" />
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800">密码要求</h5>
                  <ul className="text-sm text-yellow-700 mt-1">
                    <li>至少8个字符</li>
                    <li>包含大小写字母</li>
                    <li>包含数字</li>
                    <li>包含特殊字符</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <button className="btn-primary">更新密码</button>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">主题模式</h4>
              <div className="flex gap-4">
                <button className="flex-1 p-4 border-2 border-primary-500 bg-primary-50 rounded-lg text-center">
                  <Palette className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                  <span className="font-medium text-gray-800">浅色模式</span>
                </button>
                <button className="flex-1 p-4 border border-gray-200 rounded-lg text-center hover:border-gray-300">
                  <Palette className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="font-medium text-gray-600">深色模式</span>
                </button>
                <button className="flex-1 p-4 border border-gray-200 rounded-lg text-center hover:border-gray-300">
                  <Palette className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="font-medium text-gray-600">跟随系统</span>
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">字体大小</h4>
              <input type="range" min="12" max="18" defaultValue="14" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>小号</span>
                <span>中号</span>
                <span>大号</span>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用语言</label>
              <select className="select-field">
                <option>中文 (简体)</option>
                <option>English</option>
                <option>日本語</option>
                <option>한국어</option>
              </select>
            </div>
            
            <p className="text-sm text-gray-500">语言设置将在下次登录时生效</p>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">本地缓存</span>
                <span className="font-medium text-gray-800">156 MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">历史记录</span>
                <span className="font-medium text-gray-800">28 MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '6%' }}></div>
              </div>
            </div>
            
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              清除缓存
            </button>
            
            <button className="btn-outline flex items-center gap-2">
              <Database className="w-4 h-4" />
              导出所有数据
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">设置中心</h1>
          <p className="text-gray-500 mt-1">管理您的账户和应用偏好</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
            <Save className="w-4 h-4" />
            已保存
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <div className="card p-4 sticky top-6">
            <div className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-400">{section.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">帮助与反馈</span>
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {sections.find((s) => s.id === activeSection)?.title}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {sections.find((s) => s.id === activeSection)?.description}
                </p>
              </div>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                保存设置
              </button>
            </div>
            
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}