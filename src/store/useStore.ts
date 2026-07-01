import { create } from 'zustand';

interface ApiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
}

interface HistoryItem {
  id: string;
  content: string;
  summary: string;
  titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  };
  quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  };
  status: string;
  category: string;
  createdAt: Date;
}

interface NewsState {
  content: string;
  summary: string;
  titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  };
  quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  };
  step: number;
  summaryType: string;
  model: string;
  language: string;
  inputType: string;
  isGenerating: boolean;
  customPrompt: string;
  history: HistoryItem[];
  
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    username: string;
    email: string;
  } | null;
  
  apiConfigs: Record<string, ApiConfig>;
  
  setContent: (content: string) => void;
  setSummary: (summary: string) => void;
  setTitles: (titles: {
    objective: string;
    dataHighlight: string;
    lightweight: string;
  }) => void;
  setQuality: (quality: {
    coverageRate: number;
    titleDeviation: number;
    hallucinationCount: number;
  }) => void;
  setStep: (step: number) => void;
  setSummaryType: (summaryType: string) => void;
  setModel: (model: string) => void;
  setLanguage: (language: string) => void;
  setInputType: (inputType: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setCustomPrompt: (customPrompt: string) => void;
  addHistory: (item: {
    content: string;
    summary: string;
    titles: {
      objective: string;
      dataHighlight: string;
      lightweight: string;
    };
  }) => void;
  updateHistory: (id: string, updates: Partial<HistoryItem>) => void;
  removeMultipleHistory: (ids: string[]) => void;
  removeHistory: (id: string) => void;
  clearAll: () => void;
  
  setApiConfig: (model: string, config: ApiConfig) => void;
  getApiConfig: (model: string) => ApiConfig | undefined;
  
  login: (username: string, password: string) => boolean;
  register: (username: string, email: string, password: string) => boolean;
  logout: () => void;
}

const mockUsers = [
  { id: '1', username: 'admin', email: 'admin@example.com', password: 'admin123' },
  { id: '2', username: 'demo', email: 'demo@example.com', password: 'demo1234' },
];

const loadUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return { isAuthenticated: true, currentUser: user };
    }
  } catch (e) {
    console.error('Failed to load user from storage:', e);
  }
  return { isAuthenticated: false, currentUser: null };
};

const loadApiConfigsFromStorage = () => {
  try {
    const configStr = localStorage.getItem('apiConfigs');
    if (configStr) {
      return JSON.parse(configStr);
    }
  } catch (e) {
    console.error('Failed to load API configs from storage:', e);
  }
  return {
    'DeepSeek': { apiKey: '', apiUrl: '/api/process', model: 'DeepSeek' },
    '豆包': { apiKey: '', apiUrl: '/api/process', model: 'Doubao' },
    '文心一言': { apiKey: '', apiUrl: '/api/process', model: 'Wenxin' },
    'Kimi': { apiKey: '', apiUrl: '/api/process', model: 'Kimi' },
    '千问': { apiKey: '', apiUrl: '/api/process', model: 'Qianwen' },
  };
};

const loadHistoryFromStorage = (userId: string | null) => {
  if (!userId) return [];
  try {
    const historyStr = localStorage.getItem(`history_${userId}`);
    if (historyStr) {
      const history = JSON.parse(historyStr);
      return history.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    }
  } catch (e) {
    console.error("Failed to load history from storage:", e);
  }
  return [];
};

const saveHistoryToStorage = (userId: string | null, history: HistoryItem[]) => {
  if (!userId) return;
  try {
    localStorage.setItem(`history_${userId}`, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history to storage:", e);
  }
};

const { isAuthenticated: initialAuth, currentUser: initialUser } = loadUserFromStorage();
const initialApiConfigs = loadApiConfigsFromStorage();
const initialHistory = loadHistoryFromStorage(initialUser?.id || null);

const categoryKeywords: Record<string, string[]> = {
  '时政': ['国务院', '中央', '国家主席', '总理', '部长', '人大', '政协', '政策', '政府', '改革', '发展', '规划', '教育强国'],
  '国际': ['国际新闻', '外交部', '海外', '美国', '欧盟', '日本', '韩国', '英国', '德国', '法国', '俄罗斯', '全球', '世界各国'],
  '科技': ['科技', '技术', '互联网', '人工智能', 'AI', '大数据', '云计算', '5G', '芯片', '软件', '算法', '计算机', '手机', '数字化'],
  '财经': ['经济', '金融', '股票', '市场', '公司', '企业', '投资', '银行', '保险', '基金', '价格', '增长', '收入', 'GDP'],
  '体育': ['体育', '足球', '篮球', '比赛', '奥运', '运动员', '球队', '冠军', '联赛', '世界杯', 'NBA', 'CBA'],
  '娱乐': ['娱乐', '电影', '明星', '综艺', '音乐', '演唱会', '电视剧', '演员', '歌手', '娱乐圈'],
  '健康': ['健康', '医疗', '医院', '医生', '疾病', '疫苗', '药品', '治疗', '养生', '体检', '卫生'],
};

const classifyContent = (content: string): string => {
  
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`[\\s,，。！？、；：]${keyword}[\\s,，。！？、；：]|^${keyword}[\\s,，。！？、；：]|[\\s,，。！？、；：]${keyword}$|^${keyword}$`);
      if (regex.test(content) || content.includes(keyword)) {
        return category;
      }
    }
  }
  return '综合';
};

export const useStore = create<NewsState>((set, get) => ({
  content: '',
  summary: '',
  titles: {
    objective: '',
    dataHighlight: '',
    lightweight: '',
  },
  quality: {
    coverageRate: 0,
    titleDeviation: 0,
    hallucinationCount: 0,
  },
  step: 1,
  summaryType: '标准摘要',
  model: 'DeepSeek',
  language: '中文',
  inputType: 'text',
  isGenerating: false,
  customPrompt: "",
  history: initialHistory,
  
  isAuthenticated: initialAuth,
  currentUser: initialUser,
  
  apiConfigs: initialApiConfigs,
  
  setContent: (content) => set({ content }),
  setSummary: (summary) => set({ summary }),
  setTitles: (titles) => set({ titles }),
  setQuality: (quality) => set({ quality }),
  setStep: (step) => set({ step }),
  setSummaryType: (summaryType) => set({ summaryType }),
  setModel: (model) => set({ model }),
  setLanguage: (language) => set({ language }),
  setInputType: (inputType) => set({ inputType }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setCustomPrompt: (customPrompt) => set({ customPrompt }),
  addHistory: (item) => {
    const currentState = get();
    const category = classifyContent(item.content);
    const newItem = { 
      ...item, 
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9), 
      createdAt: new Date(),
      quality: currentState.quality,
      status: '已完成',
      category
    };
    set((state) => {
      const newHistory = [newItem, ...state.history];
      saveHistoryToStorage(state.currentUser?.id || null, newHistory);
      return { history: newHistory };
    });
  },
  updateHistory: (id, updates) => {
    set((state) => {
      const newHistory = state.history.map((item) => 
        item.id === id ? { ...item, ...updates, createdAt: new Date() } : item
      );
      saveHistoryToStorage(state.currentUser?.id || null, newHistory);
      return { history: newHistory };
    });
  },
  removeMultipleHistory: (ids) => {
    set((state) => {
      const newHistory = state.history.filter((item) => !ids.includes(item.id));
      saveHistoryToStorage(state.currentUser?.id || null, newHistory);
      return { history: newHistory };
    });
  },
  removeHistory: (id) => {
    set((state) => {
      const newHistory = state.history.filter((item) => item.id !== id);
      saveHistoryToStorage(state.currentUser?.id || null, newHistory);
      return { history: newHistory };
    });
  },
  clearAll: () => set({
    content: '',
    summary: '',
    titles: { objective: '', dataHighlight: '', lightweight: '' },
    quality: { coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 },
    step: 1,
  }),
  
  setApiConfig: (model, config) => {
    set((state) => {
      const newConfigs = { ...state.apiConfigs, [model]: config };
      try {
        localStorage.setItem('apiConfigs', JSON.stringify(newConfigs));
      } catch (e) {
        console.error('Failed to save API configs:', e);
      }
      return { apiConfigs: newConfigs };
    });
  },
  getApiConfig: (model) => {
    return get().apiConfigs[model];
  },
  
  login: (username, password) => {
    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      set({ isAuthenticated: true, currentUser: user });
      localStorage.setItem('user', JSON.stringify(user));
      return true;
    }
    return false;
  },
  
  register: (username, email, password) => {
    const existingUser = mockUsers.find((u) => u.username === username || u.email === email);
    if (existingUser) {
      return false;
    }
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
      username,
      email,
      password,
    };
    mockUsers.push(newUser);
    set({ isAuthenticated: true, currentUser: newUser });
    localStorage.setItem('user', JSON.stringify(newUser));
    return true;
  },
  
  logout: () => {
    localStorage.removeItem('user');
    set({ isAuthenticated: false, currentUser: null });
  },
}));