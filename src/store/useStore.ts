import { create } from 'zustand';
import { createHistory, getHistoryList, deleteHistory } from '@/api/history';

interface Titles {
  objective: string;
  dataHighlight: string;
  lightweight: string;
}

interface Quality {
  coverageRate: number;
  titleDeviation: number;
  hallucinationCount: number;
}

interface HistoryItem {
  id: string | number;
  content: string;
  summary: string;
  titles: Titles;
  quality?: Quality | null;
  createdAt: Date | string;
}

interface NewsState {
  content: string;
  summary: string;
  titles: Titles;
  quality: Quality;
  step: number;
  summaryType: string;
  model: string;
  language: string;
  inputType: string;
  isGenerating: boolean;
  history: HistoryItem[];
  historyLoading: boolean;
  
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    username: string;
    email: string;
  } | null;
  
  setContent: (content: string) => void;
  setSummary: (summary: string) => void;
  setTitles: (titles: Titles) => void;
  setQuality: (quality: Quality) => void;
  setStep: (step: number) => void;
  setSummaryType: (summaryType: string) => void;
  setModel: (model: string) => void;
  setLanguage: (language: string) => void;
  setInputType: (inputType: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  addHistory: (item: { content: string; summary: string; titles: Titles; quality?: Quality }) => Promise<void>;
  loadHistory: () => Promise<void>;
  removeHistory: (id: string | number) => Promise<void>;
  clearAll: () => void;
  
  login: (username: string, password: string) => boolean;
  register: (username: string, email: string, password: string) => boolean;
  logout: () => void;
}

const mockUsers = [
  { id: '1', username: 'admin', email: 'admin@example.com', password: 'admin123' },
];

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
  historyLoading: false,
  
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
    try {
      const newItem = await createHistory({
        content: item.content,
        summary: item.summary,
        titles: item.titles,
        quality: item.quality,
      });
      set((state) => ({
        history: [{ 
          id: newItem.id, 
          content: newItem.content, 
          summary: newItem.summary, 
          titles: newItem.titles,
          quality: newItem.quality,
          createdAt: newItem.created_at 
        }, ...state.history],
      }));
    } catch {
      set((state) => ({
        history: [{ 
          ...item, 
          id: Date.now().toString(), 
          createdAt: new Date() 
        }, ...state.history],
      }));
    }
  },
  
  loadHistory: async () => {
    set({ historyLoading: true });
    try {
      const response = await getHistoryList(1, 50);
      set({ 
        history: response.items.map(item => ({
          id: item.id,
          content: item.content,
          summary: item.summary,
          titles: item.titles,
          quality: item.quality,
          createdAt: item.created_at,
        })),
        historyLoading: false,
      });
    } catch {
      set({ historyLoading: false });
    }
  },
  
  removeHistory: async (id) => {
    try {
      await deleteHistory(typeof id === 'number' ? id : parseInt(id));
      set((state) => ({
        history: state.history.filter(item => item.id !== id),
      }));
    } catch {
      set((state) => ({
        history: state.history.filter(item => item.id !== id),
      }));
    }
  },
  
  clearAll: () => set({
    content: '',
    summary: '',
    titles: { objective: '', dataHighlight: '', lightweight: '' },
    quality: { coverageRate: 0, titleDeviation: 0, hallucinationCount: 0 },
    step: 1,
  }),
  
  login: (username, password) => {
    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      set({ isAuthenticated: true, currentUser: user });
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
    return true;
  },
  
  logout: () => set({ isAuthenticated: false, currentUser: null, history: [] }),
}));