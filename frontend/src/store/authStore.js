import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';

const DEFAULT_USER = {
  _id: 'guest_user_id',
  name: 'Krishna Gorde',
  email: 'guest@interviewai.com',
  role: 'super_admin',
  credits: 999,
  isActive: true,
  isPremium: true,
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      accessToken: 'demo_token',
      refreshToken: 'demo_refresh_token',
      isAuthenticated: true,
      isLoading: false,

      // ── Actions ──────────────────────────────────────────
      setAccessToken: (token) => set({ accessToken: token }),

      login: async ({ email, password }) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({
            user: data.user || DEFAULT_USER,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
      },

      register: async ({ name, email, password }) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          set({
            user: data.user || DEFAULT_USER,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, message: err.response?.data?.message || 'Registration failed' };
        }
      },

      logout: () => {
        set({
          user: DEFAULT_USER,
          accessToken: 'demo_token',
          refreshToken: 'demo_refresh_token',
          isAuthenticated: true,
        });
      },

      updateUser: (updatedUser) => {
        set({ user: { ...get().user, ...updatedUser } });
      },
    }),
    {
      name: 'ai-interview-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
