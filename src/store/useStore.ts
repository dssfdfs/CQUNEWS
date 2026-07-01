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

const { isAuthenticated: initialAuth, currentUser: initialUser } = loadUserFromStorage();
const initialApiConfigs = loadApiConfigsFromStorage();

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
  history: [],
  
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
  addHistory: (item) => {
    const currentState = get();
    const newItem = { 
      ...item, 
      id: Date.now().toString(), 
      createdAt: new Date(),
      quality: currentState.quality,
      status: '已完成',
      category: '其他'
    };
    set((state) => ({
      history: [newItem, ...state.history],
    }));
  },
  updateHistory: (id, updates) => {
    set((state) => ({
      history: state.history.map((item) => 
        item.id === id ? { ...item, ...updates, createdAt: new Date() } : item
      ),
    }));
  },
  removeHistory: (id) => {
    set((state) => ({
      history: state.history.filter((item) => item.id !== id),
    }));
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
      id: Date.now().toString(),
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