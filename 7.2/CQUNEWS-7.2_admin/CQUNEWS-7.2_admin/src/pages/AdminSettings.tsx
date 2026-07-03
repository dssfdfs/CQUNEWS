import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useToastStore } from '@/store/toastStore';
import { adminApi } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  Activity,
  MessageSquare,
  LogOut,
  Shield,
  Settings,
  Key,
  Database,
  Save,
  Download,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface AdminSettingsProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const maskApiKey = (key: string): string => {
  if (!key) return '';
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '*'.repeat(key.length - 6) + key.slice(-2);
};

export function AdminSettings({ activeItem, onItemClick }: AdminSettingsProps) {
  const { logout, currentUser } = useAdminStore();
  const { success, error } = useToastStore();
  const [apiKey, setApiKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    try {
      const data = await adminApi.getDefaultApiKey();
      setApiKey(data.api_key);
      setShowKey(false);
    } catch (err) {
      console.error('Failed to fetch API key:', err);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      await adminApi.updateDefaultApiKey(apiKey);
      success('API密钥已更新');
      setIsEditing(false);
      setShowKey(false);
    } catch (err) {
      error('保存失败');
    }
  };

  const handleTestApi = async () => {
    setTesting(true);
    try {
      const result = await adminApi.testApi(apiKey);
      if (result.success) {
        success('API连接测试成功');
      } else {
        error(result.message || 'API连接测试失败');
      }
    } catch (err) {
      error('测试失败，请检查网络连接');
    } finally {
      setTesting(false);
    }
  };

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      await adminApi.exportUsers();
      success('导出成功');
    } catch (err) {
      error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'content', label: '内容审核', icon: Activity },
    { id: 'feedback', label: '反馈管理', icon: MessageSquare },
    { id: 'logs', label: '日志管理', icon: Clock },
    { id: 'settings', label: '系统配置', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            管理后台
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
                  activeItem === item.id
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <div className="font-medium text-gray-800">{currentUser?.username || '管理员'}</div>
              <div className="text-xs text-gray-400">{currentUser?.email}</div>
            </div>
          </div>

          <div
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">退出登录</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-800">系统配置</h1>
                <p className="text-gray-500 text-sm mt-1">管理系统参数和配置</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Key className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">API配置</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    默认API密钥
                  </label>
                  <div className="relative">
                    {isEditing ? (
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                        autoFocus
                        placeholder="sk-..."
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey ? maskApiKey(apiKey) : ''}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-600"
                          placeholder="未设置"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    系统默认使用的API密钥，留空则使用环境变量配置
                  </p>
                </div>

                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveApiKey}
                        className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setShowKey(false);
                          fetchApiKey();
                        }}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        修改密钥
                      </button>
                      <button
                        onClick={handleTestApi}
                        disabled={testing || !apiKey}
                        className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {testing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        测试连接
                      </button>
                    </>
                  )}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-blue-800">API配置说明</h5>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>API密钥用于调用AI服务生成摘要和标题</li>
                        <li>修改后将立即生效，影响所有用户的请求</li>
                        <li>请确保密钥有效且有足够的调用额度</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">数据管理</h2>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleExportUsers}
                  disabled={exporting}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <Download className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">导出用户数据</p>
                      <p className="text-sm text-gray-500">下载SQLite数据库备份文件</p>
                    </div>
                  </div>
                  {exporting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600"></div>
                  ) : (
                    <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  )}
                </button>

                <button
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <Database className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">备份数据库</p>
                      <p className="text-sm text-gray-500">创建数据库快照备份</p>
                    </div>
                  </div>
                  <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </button>

                <button
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <Activity className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">清理缓存</p>
                      <p className="text-sm text-gray-500">清除临时文件和缓存数据</p>
                    </div>
                  </div>
                  <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                </button>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-700 mb-2">数据统计</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">1</p>
                      <p className="text-sm text-gray-500">数据库文件</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">12</p>
                      <p className="text-sm text-gray-500">数据表</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
