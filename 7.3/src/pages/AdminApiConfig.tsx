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
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Zap,
} from 'lucide-react';

interface AdminApiConfigProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

interface AIService {
  id: number;
  name: string;
  display_name: string;
  api_url: string;
  default_model: string;
  description: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface UserApiConfig {
  id: number;
  user_id: number;
  username: string | null;
  user_email: string | null;
  service_id: number;
  service_name: string | null;
  service_code: string | null;
  api_key: string | null;
  api_url: string | null;
  model_name: string | null;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface UserOption {
  id: number;
  username: string;
  email: string;
}

type TabType = 'services' | 'configs';

export function AdminApiConfig({ activeItem, onItemClick }: AdminApiConfigProps) {
  const { logout, currentUser } = useAdminStore();
  const { success, error } = useToastStore();

  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [services, setServices] = useState<AIService[]>([]);
  const [configs, setConfigs] = useState<UserApiConfig[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<AIService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    display_name: '',
    api_url: '',
    default_model: '',
    description: '',
  });

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<UserApiConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    user_id: 0,
    service_id: 0,
    api_key: '',
    api_url: '',
    model_name: '',
    is_default: 0,
  });

  const [testConfigId, setTestConfigId] = useState<number | null>(null);
  const [showApiKey, setShowApiKey] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesResult, configsResult, usersResult] = await Promise.all([
        adminApi.getAIServices(),
        adminApi.getUserApiConfigs(),
        adminApi.getUsers(),
      ]);
      setServices(servicesResult?.services || []);
      setConfigs(configsResult?.configs || []);
      setUsers(usersResult?.users?.map((u: any) => ({ id: u.id, username: u.username, email: u.email })) || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenServiceForm = (service?: AIService) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        display_name: service.display_name,
        api_url: service.api_url,
        default_model: service.default_model,
        description: service.description || '',
      });
    } else {
      setEditingService(null);
      setServiceForm({ name: '', display_name: '', api_url: '', default_model: '', description: '' });
    }
    setShowServiceForm(true);
  };

  const handleSaveService = async () => {
    try {
      if (editingService) {
        await adminApi.updateAIService(editingService.id, serviceForm);
        success('AI服务已更新');
      } else {
        await adminApi.createAIService(serviceForm);
        success('AI服务已创建');
      }
      setShowServiceForm(false);
      fetchData();
    } catch (err: any) {
      error(err?.message || '保存失败');
    }
  };

  const handleDeleteService = async (service: AIService) => {
    if (!window.confirm(`确定要删除AI服务 "${service.display_name}" 吗？`)) return;
    try {
      await adminApi.deleteAIService(service.id);
      success('AI服务已删除');
      fetchData();
    } catch (err: any) {
      error(err?.message || '删除失败');
    }
  };

  const handleOpenConfigForm = (config?: UserApiConfig) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        user_id: config.user_id,
        service_id: config.service_id,
        api_key: '',
        api_url: config.api_url || '',
        model_name: config.model_name || '',
        is_default: config.is_default ? 1 : 0,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({ user_id: 0, service_id: 0, api_key: '', api_url: '', model_name: '', is_default: 0 });
    }
    setShowConfigForm(true);
  };

  const handleSaveConfig = async () => {
    try {
      const data = { ...configForm };
      if (!configForm.api_key && editingConfig) {
        delete data.api_key;
      }
      if (editingConfig) {
        await adminApi.updateUserApiConfig(editingConfig.id, data);
        success('用户API配置已更新');
      } else {
        await adminApi.createUserApiConfig(data);
        success('用户API配置已创建');
      }
      setShowConfigForm(false);
      fetchData();
    } catch (err: any) {
      error(err?.message || '保存失败');
    }
  };

  const handleDeleteConfig = async (config: UserApiConfig) => {
    if (!window.confirm(`确定要删除用户 "${config.username}" 的API配置吗？`)) return;
    try {
      await adminApi.deleteUserApiConfig(config.id);
      success('用户API配置已删除');
      fetchData();
    } catch (err: any) {
      error(err?.message || '删除失败');
    }
  };

  const handleTestConfig = async (configId: number) => {
    setTestConfigId(configId);
    try {
      const result = await adminApi.testUserApiConfig(configId);
      if (result.success) {
        success('API连接测试成功');
      } else {
        error(result.message || 'API连接测试失败');
      }
    } catch (err) {
      error('测试失败');
    } finally {
      setTestConfigId(null);
    }
  };

  const navItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'content', label: '内容审核', icon: Activity },
    { id: 'feedback', label: '反馈管理', icon: MessageSquare },
    { id: 'logs', label: '日志管理', icon: Clock },
    { id: 'api-config', label: 'API配置', icon: Key },
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
                <h1 className="text-xl font-bold text-gray-800">API配置管理</h1>
                <p className="text-gray-500 text-sm mt-1">管理AI服务和用户API配置</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'services'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AI服务管理
              </span>
            </button>
            <button
              onClick={() => setActiveTab('configs')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'configs'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                用户API配置
              </span>
            </button>
          </div>

          {activeTab === 'services' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">AI服务列表</h2>
                <button
                  onClick={() => handleOpenServiceForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加服务
                </button>
              </div>

              {loading ? (
                <div className="p-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/3 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Zap className="w-16 h-16 mx-auto mb-4" />
                  <p>暂无AI服务</p>
                  <button
                    onClick={() => handleOpenServiceForm()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    添加服务
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">服务名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API地址</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">默认模型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {services.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-800">{service.display_name}</div>
                              <div className="text-xs text-gray-500">{service.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 truncate max-w-xs">{service.api_url}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{service.default_model}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              service.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {service.enabled ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenServiceForm(service)}
                                className="text-indigo-600 hover:text-indigo-700"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'configs' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">用户API配置列表</h2>
                <button
                  onClick={() => handleOpenConfigForm()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加配置
                </button>
              </div>

              {loading ? (
                <div className="p-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/5 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-1/6 h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : configs.length === 0 ? (
                <div className="p-16 text-center text-gray-400">
                  <Key className="w-16 h-16 mx-auto mb-4" />
                  <p>暂无用户API配置</p>
                  <button
                    onClick={() => handleOpenConfigForm()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    添加配置
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI服务</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API密钥</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">自定义模型</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {configs.map((config) => (
                        <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-800">{config.username}</div>
                              <div className="text-xs text-gray-500">{config.user_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm text-gray-600">{config.service_name}</div>
                              {config.is_default && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                                  默认
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-mono text-gray-600">
                                {showApiKey === config.id ? config.api_key : (config.api_key || '未设置')}
                              </div>
                              <button
                                onClick={() => setShowApiKey(showApiKey === config.id ? null : config.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {showApiKey === config.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{config.model_name || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              config.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {config.enabled ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTestConfig(config.id)}
                                disabled={testConfigId === config.id}
                                className="text-green-600 hover:text-green-700 disabled:opacity-50"
                                title="测试API连接"
                              >
                                {testConfigId === config.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenConfigForm(config)}
                                className="text-indigo-600 hover:text-indigo-700"
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteConfig(config)}
                                className="text-red-600 hover:text-red-700"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {showServiceForm && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setShowServiceForm(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white z-50 shadow-2xl rounded-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingService ? '编辑AI服务' : '添加AI服务'}
                </h2>
                <button
                  onClick={() => setShowServiceForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">服务标识</label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    disabled={!!editingService}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-50"
                    placeholder="如: deepseek"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">显示名称</label>
                  <input
                    type="text"
                    value={serviceForm.display_name}
                    onChange={(e) => setServiceForm({ ...serviceForm, display_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="如: DeepSeek"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API地址</label>
                  <input
                    type="text"
                    value={serviceForm.api_url}
                    onChange={(e) => setServiceForm({ ...serviceForm, api_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                    placeholder="https://api.example.com/chat/completions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">默认模型</label>
                  <input
                    type="text"
                    value={serviceForm.default_model}
                    onChange={(e) => setServiceForm({ ...serviceForm, default_model: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="如: deepseek-v4-flash"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                    rows={3}
                    placeholder="服务描述..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowServiceForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveService}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </>
        )}

        {showConfigForm && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setShowConfigForm(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] bg-white z-50 shadow-2xl rounded-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingConfig ? '编辑用户API配置' : '添加用户API配置'}
                </h2>
                <button
                  onClick={() => setShowConfigForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择用户</label>
                  <select
                    value={configForm.user_id}
                    onChange={(e) => setConfigForm({ ...configForm, user_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value={0}>请选择用户</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择AI服务</label>
                  <select
                    value={configForm.service_id}
                    onChange={(e) => setConfigForm({ ...configForm, service_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value={0}>请选择AI服务</option>
                    {services.filter((s) => s.enabled).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API密钥</label>
                  <input
                    type="text"
                    value={configForm.api_key}
                    onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                    placeholder={editingConfig ? '留空则不修改' : 'sk-...'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自定义API地址（可选）</label>
                  <input
                    type="text"
                    value={configForm.api_url}
                    onChange={(e) => setConfigForm({ ...configForm, api_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                    placeholder="留空使用服务默认地址"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自定义模型（可选）</label>
                  <input
                    type="text"
                    value={configForm.model_name}
                    onChange={(e) => setConfigForm({ ...configForm, model_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="留空使用服务默认模型"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={configForm.is_default === 1}
                    onChange={(e) => setConfigForm({ ...configForm, is_default: e.target.checked ? 1 : 0 })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">设为该用户默认配置</label>
                </div>
                {editingConfig && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>提示：</strong>如果不填写API密钥，则保留原有密钥不变。
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowConfigForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
