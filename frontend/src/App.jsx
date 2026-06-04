import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabase'
import { useAuthStore } from './store/authStore'
import toast from 'react-hot-toast'

// Pages
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard      from './pages/Dashboard'
import Intelligence   from './pages/Intelligence'
import StudyPlanner   from "./pages/StudyPlanner";
import Finance        from './pages/Finance'
import Cortex         from './pages/Cortex'
import AdminPortal    from './pages/AdminPortal'

// Layout
import AppLayout      from './components/AppLayout'

// ── 1. Standard Protected Route (For Students) ──
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="flex items-center justify-center h-screen text-indigo-600 font-bold tracking-widest uppercase text-sm animate-pulse">Loading System...</div>
  return user ? children : <Navigate to="/login" replace />
}

// ── 2. NEW: Admin-Only Protected Route (The Bouncer - Fail-Closed) ──
function AdminRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  
  if (loading) return <div className="flex items-center justify-center h-screen text-indigo-600 font-bold tracking-widest uppercase text-sm animate-pulse">Verifying Credentials...</div>
  
  if (!user) return <Navigate to="/login" replace />
  
  // FAIL-CLOSED: Unless we can prove you ARE an admin, you get blocked.
  if (!profile || profile.role !== 'admin') {
    // Only show the error toast if the profile actually loaded and rejected them
    if (profile) {
      toast.error('Access Denied: Administrator privileges required.', { id: 'admin-error' });
    }
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// ── 3. Public Route (For Login/Register) ──
function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  const { setUser, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, setLoading, setUser])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected routes inside app layout */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Standard Student Routes */}
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="intelligence" element={<Intelligence />} />
        <Route path="planner"      element={<StudyPlanner />} />
        <Route path="finance"      element={<Finance />} />
        <Route path="cortex"       element={<Cortex />} />
        
        {/* 🔒 LOCKED ADMIN ROUTE */}
        <Route path="admin" element={
          <AdminRoute>
            <AdminPortal />
          </AdminRoute>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}