import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, BrainCircuit, CalendarDays,
  Wallet, MessageSquare, ShieldCheck, LogOut
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/intelligence', icon: BrainCircuit,    label: 'Intelligence Hub' },
  { to: '/planner',      icon: CalendarDays,    label: 'Study Planner'    },
  { to: '/finance',      icon: Wallet,          label: 'Finance Center'   },
  { to: '/cortex',       icon: MessageSquare,   label: 'Cortex AI'        },
  { to: '/admin',        icon: ShieldCheck,     label: 'Admin Portal'     },
]

export default function Sidebar() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', marginBottom: '32px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: '#4f46e5', // Flat, deep indigo
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
            Opti<span style={{ color: '#4f46e5' }}>Mind</span>
          </h1>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 12px', marginBottom: '8px', marginTop: '8px' }}>
          Main Menu
        </div>
        
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              color: isActive ? '#4f46e5' : '#64748b',
              background: isActive ? '#eef2ff' : 'transparent',
              transition: 'all 0.15s ease'
            })}
            onMouseEnter={e => { if (e.currentTarget.style.background === 'transparent') e.currentTarget.style.background = '#f8fafc' }}
            onMouseLeave={e => { if (e.currentTarget.style.color === 'rgb(100, 116, 139)') e.currentTarget.style.background = 'transparent' }}
          >
            <Icon size={18} strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
        <div style={{ padding: '0 12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: '#f1f5f9', color: '#4f46e5', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontWeight: 'bold', fontSize: '14px' 
          }}>
            {profile?.full_name?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {profile?.full_name ?? 'Student'}
            </p>
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 500 }}>
              Opti Score: {profile?.opti_score ?? '—'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px', border: 'none',
            background: 'transparent', color: '#64748b', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} strokeWidth={2.5} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}