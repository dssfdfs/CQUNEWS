import { create } from 'zustand';
import { getHistory, addHistory, deleteHistory } from '@/api/deepseek';

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
  history: Array<{
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
  }>;
  
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    username: string;
    email: string;
    role?: string;
  } | null;
  
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
  removeHistory: (id: string) => void;
  loadHistory: () => Promise<void>;
  clearAll: () => void;
  
  login: (username: string, password: string, userInfo?: any) => boolean;
  register: (username: string, email: string, password: string, userInfo?: any) => boolean;
  logout: () => void;
}

export const useStore = create<NewsState>((set) => ({
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
  
  isAuthenticated: false,
  currentUser: null,
  
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
  
  addHistory: async (item) => {
    const newItem = { ...item, id: Date.now().toString(), createdAt: new Date() };
    
    const currentState = useStore.getState();
    if (currentState.currentUser) {
      try {
        await addHistory({
          ...item,
          quality: currentState.quality,
          user_id: parseInt(currentState.currentUser.id),
        });
      } catch (err) {
        console.error('Failed to save history:', err);
      }
    }
    
    set((state) => ({
      history: [newItem, ...state.history],
    }));
  },
  
  removeHistory: async (id) => {
    try {
      await deleteHistory(parseInt(id));
    } catch (err) {
      console.error('Failed to delete history:', err);
    }
    
    set((state) => ({
      history: state.history.filter((item) => item.id !== id),
    }));
  },
  
  loadHistory: async () => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return;
    
    try {
      const user_id = parseInt(currentState.currentUser.id);
      const result = await getHistory(user_id);
      const historyData = result.data || result;
      set({
        history: historyData.map((item: any) => ({
          id: item.id.toString(),
          content: item.content,
          summary: item.summary,
          titles: item.titles,
          quality: item.quality || { coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 },
          status: item.status || '待处理',
          category: item.category || '其他',
          createdAt: new Date(item.createdAt),
        })),
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  },
  
  clearAll: () => set({
    content: '',
    summary: '',
    titles: { objective: '', dataHighlight: '', lightweight: '' },
    quality: { coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 },
    step: 1,
  }),
  
  login: (username, _password, userInfo) => {
    const user = userInfo || {
      id: Date.now().toString(),
      username,
      email: '',
      role: 'user',
    };
    set({ isAuthenticated: true, currentUser: user });
    return true;
  },
  
  register: (_username: string, _email: string, _password: string, _userInfo?: any) => {
    set({ isAuthenticated: false, currentUser: null });
    return true;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ isAuthenticated: false, currentUser: null, history: [] });
  },
}));