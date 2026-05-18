import { create } from 'zustand'
import { supabase } from '../services/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  // ── AUTHENTICATION ACTIONS ──
  
  // Handles real user registration
  signUp: async (email, password, metadata) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata // Passes full_name, role, semester, department, etc.
      }
    })
    if (error) {
      set({ loading: false })
      throw error
    }
    return data
  },

  // Handles real user login
  signIn: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false })
      throw error
    }
    return data
  },

  // ── PROFILE DATA MANAGEMENT ──
  
  // Fetches the profile row created automatically by your database trigger
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) set({ profile: data })
    } catch (error) {
      console.error('Error fetching profile context:', error.message)
    } finally {
      set({ loading: false })
    }
  },

  // Signs out the user and clears state memory
  logout: async () => {
    set({ loading: true })
    await supabase.auth.signOut()
    set({ user: null, profile: null, loading: false })
  }
}))