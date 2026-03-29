import { create } from "zustand"
import { api } from "@/lib/api"

interface AppState {
  // Auth
  accessToken: string | null
  walletAddress: string | null
  setAuth: (token: string, wallet: string) => void
  clearAuth: () => void

  // UI
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Waitlist
  waitlistRank: number | null
  setWaitlistRank: (rank: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  accessToken: null,
  walletAddress: null,
  setAuth: (token, wallet) => {
    api.setToken(token)
    set({ accessToken: token, walletAddress: wallet })
  },
  clearAuth: () => {
    api.setToken(null)
    set({ accessToken: null, walletAddress: null })
  },

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Waitlist
  waitlistRank: null,
  setWaitlistRank: (rank) => set({ waitlistRank: rank }),
}))
