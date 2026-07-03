import { create } from 'zustand';

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
    createdAt: Date;
  }>;
  
  isAuthenticated: boolean;
  currentUser: {
    id: string;
    username: string;
    email: string;
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
  clearAll: () => void;
  
  login: (username: string, password: string) => boolean;
  register: (username: string, email: string, password: string) => boolean;
  logout: () => void;
}

const mockUsers = [
  { id: '1', username: 'admin', email: 'admin@example.com', password: 'admin123' },
  { id: '2', username: 'demo', email: 'demo@example.com', password: 'demo1234' },
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
  addHistory: (item) => set((state) => ({
    history: [{ ...item, id: Date.now().toString(), createdAt: new Date() }, ...state.history],
  })),
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
  
  logout: () => set({ isAuthenticated: false, currentUser: null }),
}));