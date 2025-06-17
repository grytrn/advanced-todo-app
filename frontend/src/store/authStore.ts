import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../services'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authService.login({ email, password })
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
          toast.success('Welcome back!')
        } catch (error) {
          set({ isLoading: false })
          toast.error('Invalid email or password')
          throw error
        }
      },

      signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true })
        try {
          const response = await authService.signup({ email, password, name })
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
          toast.success('Account created successfully!')
        } catch (error) {
          set({ isLoading: false })
          toast.error('Failed to create account')
          throw error
        }
      },

      logout: async () => {
        try {
          await authService.logout()
          set({
            user: null,
            isAuthenticated: false,
          })
          toast.success('Logged out successfully')
        } catch (error) {
          toast.error('Failed to logout')
          throw error
        }
      },

      refreshUser: async () => {
        try {
          const response = await authService.getMe()
          set({
            user: response.user,
            isAuthenticated: true,
          })
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
)