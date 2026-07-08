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
  Clock,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Trash2,
  Info,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface AdminSettingsProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

interface ModelField {
  key: string;
  label: string;
  type: string;
}

interface ModelConfig {
  name: string;
  fields: ModelField[];
  default_url: string;
  url: string;
  config: Record<string, string>;
  is_active: boolean;
}

const DEFAULT_MODEL_CONFIGS: Record<string, Record<string, string>> = {
  'Deepseek': {
    api_key: 'sk-ca2a253625df40619c2967ef23a4b87d',
  },
  '阿里云千问': {
    app_id: '6001766',
    api_key: 'sk-ws-H.EMMDPEE.jDBh.MEYCIQD1gei0N-aQWOaatIU0_TQtyK_wNK8SWd-cFERo5P7ecwIhAK3hsaAKHQTS3Nsm2tmz9xPsevomTzARtbBthrf0GbjX',
  },
  'Kimi': {
    api_key: 'sk-YXUjTOxa0VemwPWasgNhUSU2wgQ4vWTJBuZRInWszFnPBMw2',
  },
  '豆包': {
    api_key: 'ark-08b4ae22-2edc-4371-89ef-8d5e56cdb3f1-1c7aa',
  },
};

const maskApiKey = (key: string): string => {
  if (!key) return '';
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '*'.repeat(key.length - 6) + key.slice(-2);
};

export function AdminSettings({ activeItem, onItemClick }: AdminSettingsProps) {
  const { logout, currentUser } = useAdminStore();
  const { success, error } = useToastStore();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [modelConfigs, setModelConfigs] = useState<Record<string, Record<string, string>>>({});
  const [modelUrls, setModelUrls] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingModels, setTestingModels] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  
  const [storageQuota, setStorageQuota] = useState(500 * 1024 * 1024);
  const [cacheSize, setCacheSize] = useState(156);
  const [historySize, setHistorySize] = useState(28);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupFiles, setBackupFiles] = useState<Array<{ filename: string; size: string; created_at: string }>>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  useEffect(() => {
    loadModelConfigs();
    loadBackupFiles();
  }, []);

  const loadBackupFiles = async () => {
    setLoadingBackups(true);
    try {
      const result = await adminApi.getBackupFiles();
      setBackupFiles(result?.backups || []);
    } catch (err) {
      console.error('Failed to load backup files:', err);
      setBackupFiles([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  const loadModelConfigs = async () => {
    try {
      const result = await adminApi.getModelConfigs();
      const modelsData = result?.models || [];
      setModels(modelsData);
      
      const configs: Record<string, Record<string, string>> = {};
      const urls: Record<string, string> = {};
      const showKeyMap: Record<string, boolean> = {};
      const testResultMap: Record<string, { success: boolean; message: string } | null> = {};
      
      modelsData.forEach(model => {
        const defaultConfig = DEFAULT_MODEL_CONFIGS[model.name] || {};
        configs[model.name] = { ...defaultConfig, ...model.config };
        urls[model.name] = model.url || model.default_url;
        showKeyMap[model.name] = false;
        testResultMap[model.name] = null;
      });
      
      setModelConfigs(configs);
      setModelUrls(urls);
      setShowKeys(showKeyMap);
      setTestResults(testResultMap);
    } catch (err) {
      console.error('Failed to load model configs:', err);
    }
  };

  const handleToggleModel = async (modelName: string) => {
    const model = models.find(m => m.name === modelName);
    if (!model) return;
    
    const newActive = !model.is_active;
    try {
      await adminApi.updateModelConfig(modelName, modelConfigs[modelName] || {}, modelUrls[modelName], newActive);
      setModels(prev => prev.map(m => m.name === modelName ? { ...m, is_active: newActive } : m));
      success(`${modelName} ${newActive ? '已启用' : '已禁用'}`);
    } catch (err) {
      error('操作失败');
    }
  };

  const handleSaveModelConfig = async (modelName: string) => {
    try {
      const model = models.find(m => m.name === modelName);
      if (!model) return;
      
      await adminApi.updateModelConfig(modelName, modelConfigs[modelName] || {}, modelUrls[modelName], model.is_active);
      setEditingModel(null);
      setShowKeys(prev => ({ ...prev, [modelName]: false }));
      await loadModelConfigs();
      success(`${modelName} 配置已保存`);
    } catch (err) {
      error('保存失败');
    }
  };

  const handleTestModel = async (modelName: string) => {
    setTestingModels(prev => ({ ...prev, [modelName]: true }));
    setTestResults(prev => ({ ...prev, [modelName]: null }));
    
    try {
      const model = models.find(m => m.name === modelName);
      if (!model) return;
      
      const result = await adminApi.testModelConnection(modelName, modelConfigs[modelName] || {}, modelUrls[modelName]);
      setTestResults(prev => ({ ...prev, [modelName]: result }));
      
      if (result.success) {
        success(`${modelName} 连接测试成功`);
      } else {
        error(`${modelName} 连接测试失败: ${result.message}`);
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [modelName]: { success: false, message: '测试失败，请检查网络连接' } }));
      error('测试失败');
    } finally {
      setTestingModels(prev => ({ ...prev, [modelName]: false }));
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

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await adminApi.clearCache();
      setCacheSize(0);
      success('缓存清理成功');
    } catch (err) {
      error('缓存清理失败');
    } finally {
      setClearingCache(false);
    }
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    try {
      await adminApi.clearHistory();
      setHistorySize(0);
      success('历史记录清理成功');
    } catch (err) {
      error('历史记录清理失败');
    } finally {
      setClearingHistory(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await adminApi.backupDatabase();
      success('数据库备份成功');
      await loadBackupFiles();
    } catch (err) {
      error('数据库备份失败');
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      await adminApi.downloadBackup(filename);
      success('备份文件下载成功');
    } catch (err) {
      error('备份文件下载失败');
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
            <div className="bg-white rounded-xl border border-gray-100 p-6 col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Key className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">大模型API配置</h2>
              </div>

              <div className="space-y-4">
                {models.map((model) => (
                  <div
                    key={model.name}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setExpandedModel(expandedModel === model.name ? null : model.name)}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleModel(model.name);
                          }}
                          className="p-1.5 rounded-full transition-colors"
                        >
                          {model.is_active ? (
                            <ToggleRight className="w-8 h-8 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium text-gray-800">{model.name}</div>
                          <div className="text-xs text-gray-500">
                            {model.is_active ? '已启用' : '已禁用'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {testResults[model.name] && (
                          <div className={`flex items-center gap-1 text-sm ${
                            testResults[model.name]!.success ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {testResults[model.name]!.success ? (
                              <Wifi className="w-4 h-4" />
                            ) : (
                              <WifiOff className="w-4 h-4" />
                            )}
                            {testResults[model.name]!.success ? '连接成功' : '连接失败'}
                          </div>
                        )}
                        {expandedModel === model.name ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedModel === model.name && (
                      <div className="p-4 space-y-4 bg-white">
                        <div className="space-y-3">
                          {model.fields.map((field) => (
                            <div key={field.key}>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {field.label}
                              </label>
                              <div className="relative">
                                {editingModel === model.name ? (
                                  <input
                                    type={field.type === 'password' ? 'text' : 'text'}
                                    value={modelConfigs[model.name]?.[field.key] || ''}
                                    onChange={(e) => {
                                      setModelConfigs(prev => ({
                                        ...prev,
                                        [model.name]: {
                                          ...prev[model.name],
                                          [field.key]: e.target.value,
                                        },
                                      }));
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                                    placeholder={`请输入${field.label}`}
                                  />
                                ) : (
                                  <div className="relative">
                                    <input
                                      type={showKeys[model.name] ? 'text' : 'password'}
                                      value={modelConfigs[model.name]?.[field.key] ? maskApiKey(modelConfigs[model.name][field.key]) : ''}
                                      readOnly
                                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm text-gray-600"
                                      placeholder="未设置"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowKeys(prev => ({ ...prev, [model.name]: !prev[model.name] }));
                                      }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      {showKeys[model.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API地址
                          </label>
                          {editingModel === model.name ? (
                            <input
                              type="text"
                              value={modelUrls[model.name] || ''}
                              onChange={(e) => {
                                setModelUrls(prev => ({ ...prev, [model.name]: e.target.value }));
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                              placeholder="https://api.example.com/v1"
                            />
                          ) : (
                            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 truncate">
                              {modelUrls[model.name] || '未设置'}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          {editingModel === model.name ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveModelConfig(model.name);
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                保存
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingModel(null);
                                  setShowKeys(prev => ({ ...prev, [model.name]: false }));
                                }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                取消
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingModel(model.name);
                                }}
                                className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Key className="w-4 h-4" />
                                修改配置
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestModel(model.name);
                                }}
                                disabled={testingModels[model.name]}
                                className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {testingModels[model.name] ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                                {testingModels[model.name] ? '测试中...' : '测试连接'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-blue-800">API配置说明</h5>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>每个AI模型需要单独配置API密钥和地址</li>
                      <li>点击模型名称左侧的开关可以启用/禁用该模型</li>
                      <li>修改配置后点击"保存"按钮使配置生效</li>
                      <li>点击"测试连接"验证API配置是否正确</li>
                      <li>至少需要启用一个模型才能使用摘要生成功能</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">数据管理</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-blue-500" />
                      <div>
                        <h4 className="font-medium text-gray-800">数据库状态</h4>
                        <p className="text-sm text-gray-500">SQLite 数据库</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      正常
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-800 mb-4">存储位置</h4>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">应用数据目录</p>
                        <p className="text-xs text-gray-500">./data/cqunews.db</p>
                      </div>
                    </div>
                    <button className="text-sm text-primary-600 hover:text-primary-700">
                      打开目录
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">数据操作</h4>
                  
                  <button 
                    onClick={handleExportUsers}
                    disabled={exporting}
                    className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {exporting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exporting ? '导出中...' : '导出数据库 (.sql)'}
                  </button>
                  
                  <button 
                    onClick={handleBackup}
                    disabled={backingUp}
                    className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {backingUp ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {backingUp ? '备份中...' : '备份数据'}
                  </button>

                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-800">数据备份建议</h5>
                      <ul className="text-sm text-yellow-700 mt-1">
                        <li>定期导出数据库文件进行备份</li>
                        <li>备份文件建议存放在安全位置</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-800 mb-3">备份文件</h4>
                  {loadingBackups ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="ml-2 text-sm text-gray-500">加载中...</span>
                    </div>
                  ) : backupFiles.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      暂无备份文件，点击"备份数据"创建备份
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {backupFiles.map((file) => (
                        <div
                          key={file.filename}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{file.filename}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(file.created_at).toLocaleString('zh-CN')} · {file.size}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadBackup(file.filename)}
                            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}