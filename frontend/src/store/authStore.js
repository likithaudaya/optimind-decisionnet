import { create } from 'zustand'
import { supabase } from '../services/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      set({ profile: data })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  }
}))