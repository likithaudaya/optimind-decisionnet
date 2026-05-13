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
      width: '240px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(22, 22, 42, 0.8)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      padding: '16px',
      margin: '12px',
      borderRadius: '16px'
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '32px', padding: '0 8px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
          Opti<span style={{ color: '#818cf8' }}>Mind</span>
        </h1>
        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>DecisionNet</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '16px' }}>
        <div style={{ padding: '0 8px', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#cbd5e1' }}>
            {profile?.full_name ?? 'Student'}
          </p>
          <p style={{ fontSize: '11px', color: '#64748b' }}>
            Opti Score: {profile?.opti_score ?? '—'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{ color: '#f87171', width: '100%', background: 'none', border: 'none' }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  )
}