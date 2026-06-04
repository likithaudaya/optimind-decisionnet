import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password) { 
      toast.error('Please fill in all fields')
      return 
    }
    
    setLoading(true)
    
    // This is where the magic happens! 
    // We send the full_name in the "options.data" payload so your SQL trigger catches it.
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    
    if (error) { 
      toast.error(error.message)
      setLoading(false)
      return 
    }
    
    toast.success('Account created successfully! Welcome to OptiMind.')
    // Note: If you have "Confirm Email" turned on in Supabase, they may need to verify first.
    navigate('/dashboard')
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '13px 14px 13px 42px',
    background: '#fff',
    border: `1.5px solid ${focusedField === field ? '#6366f1' : '#e5e7eb'}`,
    borderRadius: '12px',
    color: '#111827',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
    boxShadow: focusedField === field ? '0 0 0 4px rgba(99,102,241,0.08)' : 'none',
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fc',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        minHeight: '100vh',
      }}>

        {/* Top-left logo */}
        <div style={{ position: 'absolute', top: '2rem', left: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827', letterSpacing: '-0.3px' }}>
            Opti<span style={{ color: '#6366f1' }}>Mind</span>
          </span>
        </div>

        {/* Form card */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2.5rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
              Create your workspace
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Start optimizing your academic journey today.
            </p>
          </div>

          <form onSubmit={handleRegister}>

            {/* ── FULL NAME ── */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={focusedField === 'name' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke={focusedField === 'name' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('name')}
                />
              </div>
            </div>

            {/* ── EMAIL ── */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      stroke={focusedField === 'email' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8"/>
                    <path d="M22 6l-10 7L2 6"
                      stroke={focusedField === 'email' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('email')}
                />
              </div>
            </div>

            {/* ── PASSWORD ── */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Create Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2"
                      stroke={focusedField === 'password' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"
                      stroke={focusedField === 'password' ? '#6366f1' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('password'), paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#9ca3af'
                }}>
                  {showPass ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                        stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M1 1l22 22" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9ca3af" strokeWidth="1.8"/>
                      <circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="1.8"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── SUBMIT ── */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none', borderRadius: '12px',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
                letterSpacing: '0.1px'
              }}
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }}/>
            <span style={{ fontSize: '12px', color: '#d1d5db', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }}/>
          </div>

          {/* Login link */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        width: '480px', flexShrink: 0,
        background: 'linear-gradient(160deg, #6366f1 0%, #4338ca 50%, #312e81 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}/>

        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '1.5rem', letterSpacing: '-0.4px', lineHeight: 1.3 }}>
            Join the future of<br/>academic intelligence
          </h2>

          {[
            { icon: '🚀', title: 'Start for Free', desc: 'Get immediate access to study planning tools.' },
            { icon: '🔐', title: 'Secure & Private', desc: 'Your data is encrypted and completely yours.' },
            { icon: '📈', title: 'Unlock Premium AI', desc: 'Upgrade anytime for full local LLM access.' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '1.25rem' }}>
              <div style={{
                width: '38px', height: '38px', flexShrink: 0,
                background: 'rgba(255,255,255,0.12)', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', border: '1px solid rgba(255,255,255,0.15)'
              }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}