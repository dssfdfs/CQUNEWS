import { create } from 'zustand';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  created_at: string;
}

interface AdminState {
  isAuthenticated: boolean;
  currentUser: AdminUser | null;
  accessToken: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

const loadAdminFromStorage = () => {
  try {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      return { isAuthenticated: true, currentUser: user, accessToken: token };
    }
  } catch (e) {
    console.error('Failed to load admin from storage:', e);
  }
  return { isAuthenticated: false, currentUser: null, accessToken: null };
};

const { isAuthenticated: initialAuth, currentUser: initialUser, accessToken: initialToken } = loadAdminFromStorage();

const adminCredentials = {
  username: 'admin',
  password: 'admin123',
};

export const useAdminStore = create<AdminState>((set) => ({
  isAuthenticated: initialAuth,
  currentUser: initialUser,
  accessToken: initialToken,

  login: async (username: string, password: string) => {
    try {
      if (username === adminCredentials.username && password === adminCredentials.password) {
        const mockUser: AdminUser = {
          id: 1,
          username: 'admin',
          email: 'admin@cqunews.com',
          is_superuser: true,
          created_at: '2024-01-01T00:00:00Z',
        };
        const token = 'admin_token_' + Date.now();

        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(mockUser));

        set({
          isAuthenticated: true,
          currentUser: mockUser,
          accessToken: token,
        });

        return true;
      }

      try {
        const response = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        const { access_token, user } = data;

        localStorage.setItem('admin_token', access_token);
        localStorage.setItem('admin_user', JSON.stringify(user));

        set({
          isAuthenticated: true,
          currentUser: user,
          accessToken: access_token,
        });

        return true;
      } catch {
        return false;
      }
    } catch (error) {
      console.error('Admin login failed:', error);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    set({
      isAuthenticated: false,
      currentUser: null,
      accessToken: null,
    });
  },

  checkAuth: () => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({
          isAuthenticated: true,
          currentUser: user,
          accessToken: token,
        });
      } catch (e) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        set({
          isAuthenticated: false,
          currentUser: null,
          accessToken: null,
        });
      }
    } else {
      set({
        isAuthenticated: false,
        currentUser: null,
        accessToken: null,
      });
    }
  },
}));