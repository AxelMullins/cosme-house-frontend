import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TOKEN_STORAGE_KEY } from '@/api/client'
import type { User } from '@/schemas/auth.schema'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token)
        set({ token, user, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'cosme_house_auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
