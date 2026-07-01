import { create } from 'zustand';
import { getHistory, addHistory, deleteHistory, getSettings, saveSettings, getUserInfo, updateUserInfo, updateAvatar } from '@/api/deepseek';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', systemTheme);
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

let systemThemeUnsubscribe: (() => void) | null = null;

function setupSystemThemeListener() {
  if (systemThemeUnsubscribe) {
    systemThemeUnsubscribe();
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = () => {
    const currentTheme = useStore.getState().settings.theme;
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };
  
  mediaQuery.addEventListener('change', handler);
  systemThemeUnsubscribe = () => mediaQuery.removeEventListener('change', handler);
}

function removeSystemThemeListener() {
  if (systemThemeUnsubscribe) {
    systemThemeUnsubscribe();
    systemThemeUnsubscribe = null;
  }
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  language: string;
  emailNotification: boolean;
  soundNotification: boolean;
  qualityNotification: boolean;
  storageQuota: number;
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
    avatar?: string;
    bio?: string;
    role?: string;
  } | null;
  
  settings: SettingsState;
  settingsLoading: boolean;
  settingsError: string | null;
  
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
  
  login: (username: string, password: string, userInfo?: any) => Promise<boolean>;
  register: (username: string, email: string, password: string, userInfo?: any) => boolean;
  logout: () => void;
  
  restoreAuth: () => Promise<void>;
  
  loadUserInfo: () => Promise<void>;
  updateUserInfo: (data: { email?: string; bio?: string }) => Promise<boolean>;
  updateAvatar: (avatar: string) => Promise<boolean>;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setFontSize: (fontSize: number) => void;
  setLanguageSetting: (language: string) => void;
  setEmailNotification: (enabled: boolean) => void;
  setSoundNotification: (enabled: boolean) => void;
  setQualityNotification: (enabled: boolean) => void;
  setStorageQuota: (quota: number) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
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
  
  settings: {
    theme: 'light',
    fontSize: 14,
    language: 'zh',
    emailNotification: true,
    soundNotification: false,
    qualityNotification: true,
    storageQuota: 524288000,
  },
  settingsLoading: false,
  settingsError: null,
  
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
    const currentState = useStore.getState();
    const newItem = { 
      ...item, 
      id: Date.now().toString(), 
      createdAt: new Date(),
      quality: currentState.quality,
      status: 'completed',
      category: 'news',
    };
    
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
  
  login: async (username, _password, userInfo) => {
    const user = userInfo || {
      id: Date.now().toString(),
      username,
      email: '',
      role: 'user',
    };
    set({ isAuthenticated: true, currentUser: user });
    
    try {
      await useStore.getState().loadSettings();
    } catch (err) {
      console.error('Failed to load settings after login:', err);
    }
    
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
  
  setTheme: (theme) => {
    set((state) => {
      const newSettings = { ...state.settings, theme };
      localStorage.setItem('theme', theme);
      applyTheme(theme);
      
      if (theme === 'system') {
        setupSystemThemeListener();
      } else {
        removeSystemThemeListener();
      }
      
      return { settings: newSettings };
    });
  },
  
  setFontSize: (fontSize) => set((state) => {
    const newSettings = { ...state.settings, fontSize };
    localStorage.setItem('fontSize', fontSize.toString());
    document.documentElement.style.fontSize = `${fontSize}px`;
    return { settings: newSettings };
  }),
  
  setLanguageSetting: (language) => set((state) => {
    const newSettings = { ...state.settings, language };
    localStorage.setItem('language', language);
    return { settings: newSettings };
  }),
  
  setEmailNotification: (enabled) => set((state) => ({
    settings: { ...state.settings, emailNotification: enabled },
  })),
  
  setSoundNotification: (enabled) => set((state) => ({
    settings: { ...state.settings, soundNotification: enabled },
  })),
  
  setQualityNotification: (enabled) => set((state) => ({
    settings: { ...state.settings, qualityNotification: enabled },
  })),
  
  setStorageQuota: (quota) => set((state) => ({
    settings: { ...state.settings, storageQuota: quota },
  })),
  
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),
  
  loadSettings: async () => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return;
    
    set({ settingsLoading: true, settingsError: null });
    
    try {
      const result = await getSettings();
      
      const newSettings: SettingsState = {
        theme: (result.theme as 'light' | 'dark' | 'system') || 'light',
        fontSize: result.font_size || 14,
        language: result.language || 'zh',
        emailNotification: result.email_notification || false,
        soundNotification: result.sound_notification || false,
        qualityNotification: result.quality_notification || false,
        storageQuota: result.storage_quota || 524288000,
      };
      
      set({ settings: newSettings, settingsLoading: false });
      
      localStorage.setItem('theme', newSettings.theme);
      localStorage.setItem('fontSize', newSettings.fontSize.toString());
      localStorage.setItem('language', newSettings.language);
      
      applyTheme(newSettings.theme);
      document.documentElement.style.fontSize = `${newSettings.fontSize}px`;
      
      if (newSettings.theme === 'system') {
        setupSystemThemeListener();
      } else {
        removeSystemThemeListener();
      }
    } catch (err: any) {
      set({ 
        settingsLoading: false, 
        settingsError: err.message || '加载设置失败' 
      });
      console.error('Failed to load settings:', err);
    }
  },
  
  saveSettings: async () => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return false;
    
    try {
      await saveSettings({
        theme: currentState.settings.theme,
        font_size: currentState.settings.fontSize,
        language: currentState.settings.language,
        email_notification: currentState.settings.emailNotification,
        sound_notification: currentState.settings.soundNotification,
        quality_notification: currentState.settings.qualityNotification,
        storage_quota: currentState.settings.storageQuota,
      });
      
      localStorage.setItem('theme', currentState.settings.theme);
      localStorage.setItem('fontSize', currentState.settings.fontSize.toString());
      localStorage.setItem('language', currentState.settings.language);
      
      return true;
    } catch (err: any) {
      set({ settingsError: err.message || '保存设置失败' });
      console.error('Failed to save settings:', err);
      return false;
    }
  },
  
  restoreAuth: async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ isAuthenticated: true, currentUser: user });
        
        try {
          await useStore.getState().loadSettings();
          await useStore.getState().loadUserInfo();
        } catch (err) {
          console.error('Failed to load settings/user info during auth restore:', err);
        }
      } catch (err) {
        console.error('Failed to parse user info:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
  
  loadUserInfo: async () => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return;
    
    try {
      const result = await getUserInfo();
      const updatedUser = {
        id: currentState.currentUser.id,
        username: currentState.currentUser.username,
        email: result.email || '',
        avatar: result.avatar || '',
        bio: result.bio || '',
        role: currentState.currentUser.role,
      };
      set({ currentUser: updatedUser });
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed to load user info:', err);
    }
  },
  
  updateUserInfo: async (data) => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return false;
    
    try {
      await updateUserInfo(data);
      
      const updatedUser = {
        ...currentState.currentUser,
        ...data,
      } as { id: string; username: string; email: string; avatar?: string; bio?: string; role?: string };
      set({ currentUser: updatedUser });
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return true;
    } catch (err) {
      console.error('Failed to update user info:', err);
      return false;
    }
  },
  
  updateAvatar: async (avatar) => {
    const currentState = useStore.getState();
    if (!currentState.currentUser) return false;
    
    try {
      await updateAvatar(avatar);
      
      const updatedUser = {
        ...currentState.currentUser,
        avatar,
      } as { id: string; username: string; email: string; avatar: string; bio?: string; role?: string };
      set({ currentUser: updatedUser });
      
      localStorage.setItem('user', JSON.stringify({
        ...currentState.currentUser,
        avatar,
      }));
      
      return true;
    } catch (err) {
      console.error('Failed to update avatar:', err);
      return false;
    }
  },
}));