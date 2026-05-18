import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import toast from 'react-hot-toast'

const ROLES = ['Student', 'Faculty', 'Admin']
const SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    role: 'Student', semester: '1st', department: '', student_id: ''
  })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validateStep1 = () => {
    if (!form.full_name.trim()) { toast.error('Enter your full name'); return false }
    if (!form.email.includes('@')) { toast.error('Enter a valid email'); return false }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return false }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return false }
    return true
  }

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (!form.department.trim()) {
      toast.error('Enter your department');
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: form.role,
            department: form.department,
            semester: form.semester,
            student_id: form.student_id
          }
        }
      });

      if (error) throw error;

      // Force sign out immediately after registration to prevent stale auto-login bugs
      await supabase.auth.signOut();
      toast.success("Account created successfully! Please sign in.");
      navigate('/login');
    } catch (error) {
      toast.error(error.message || "Failed to create account");
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '12px 14px 12px 42px',
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
      minHeight: '100vh', background: '#f8f9fc',
      display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif"
    }}>

      {/* ── Left: Form ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem', position: 'relative'
      }}>

        {/* Logo */}
        <div style={{ position: 'absolute', top: '2rem', left: '2.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
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

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: '440px',
          background: '#fff', borderRadius: '20px',
          padding: '2.5rem', border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>

          {/* Progress bar */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.4px' }}>
                {step === 1 ? 'Create your account' : 'Complete your profile'}
              </h1>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                Step {step} of 2
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
              {step === 1 ? 'Start with your login credentials' : 'Tell us about your academic profile'}
            </p>
            <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
                width: step === 1 ? '50%' : '100%',
                transition: 'width 0.4s ease'
              }}/>
            </div>
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div>

              {/* Full Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={focusedField==='name'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="12" cy="7" r="4" stroke={focusedField==='name'?'#6366f1':'#9ca3af'} strokeWidth="1.8"/>
                    </svg>
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Your Full Name"
                    value={form.full_name}
                    onChange={e => set('full_name', e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('reg-email').focus() }}}
                    style={inputStyle('name')}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={focusedField==='email'?'#6366f1':'#9ca3af'} strokeWidth="1.8"/>
                      <path d="M22 6l-10 7L2 6" stroke={focusedField==='email'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('reg-password').focus() }}}
                    style={inputStyle('email')}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke={focusedField==='pass'?'#6366f1':'#9ca3af'} strokeWidth="1.8"/>
                      <path d="M7 11V7a5 5 0 0110 0v4" stroke={focusedField==='pass'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('reg-confirm').focus() }}}
                    style={{ ...inputStyle('pass'), paddingRight: '42px' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '13px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0
                  }}>
                    {showPass
                      ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9ca3af" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="1.8"/></svg>
                    }
                  </button>
                </div>
                {/* Password strength */}
                {form.password.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '99px',
                          background: form.password.length >= i*2+2
                            ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#10b981' : '#6366f1'
                            : '#f3f4f6',
                          transition: 'background 0.3s'
                        }}/>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {form.password.length < 6 ? 'Weak' : form.password.length < 8 ? 'Fair' : form.password.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={form.confirm_password && form.confirm_password===form.password?'#10b981':'#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M22 4L12 14.01l-3-3" stroke={form.confirm_password && form.confirm_password===form.password?'#10b981':'#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="reg-confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={form.confirm_password}
                    onChange={e => set('confirm_password', e.target.value)}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (validateStep1()) setStep(2) }}}
                    style={{
                      ...inputStyle('confirm'),
                      borderColor: form.confirm_password
                        ? form.confirm_password === form.password ? '#10b981' : '#ef4444'
                        : focusedField === 'confirm' ? '#6366f1' : '#e5e7eb'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => { if (validateStep1()) setStep(2) }}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s', letterSpacing: '0.1px'
                }}
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div>

              {/* Role selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                  I am a...
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => set('role', r)} style={{
                      flex: 1, padding: '10px 8px',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: `1.5px solid ${form.role === r ? '#6366f1' : '#e5e7eb'}`,
                      background: form.role === r ? 'rgba(99,102,241,0.06)' : '#fff',
                      color: form.role === r ? '#6366f1' : '#6b7280',
                      boxShadow: form.role === r ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none'
                    }}>
                      {r === 'Student' ? '🎓' : r === 'Faculty' ? '👨‍🏫' : '🛡️'} {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student ID */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Student / Staff ID
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <rect x="2" y="7" width="20" height="14" rx="2" stroke={focusedField==='sid'?'#6366f1':'#9ca3af'} strokeWidth="1.8"/>
                      <path d="M16 3H8L6 7h12l-2-4z" stroke={focusedField==='sid'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="reg-sid"
                    type="text"
                    placeholder="Your Student ID"
                    value={form.student_id}
                    onChange={e => set('student_id', e.target.value)}
                    onFocus={() => setFocusedField('sid')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('reg-dept').focus() }}}
                    style={inputStyle('sid')}
                  />
                </div>
              </div>

              {/* Department */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Department
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={focusedField==='dept'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M9 22V12h6v10" stroke={focusedField==='dept'?'#6366f1':'#9ca3af'} strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="reg-dept"
                    type="text"
                    placeholder="Your Department"
                    value={form.department}
                    onChange={e => set('department', e.target.value)}
                    onFocus={() => setFocusedField('dept')}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRegister() }}}
                    style={inputStyle('dept')}
                  />
                </div>
              </div>

              {/* Semester */}
              {form.role === 'Student' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                    Current Semester
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {SEMESTERS.map(s => (
                      <button key={s} type="button" onClick={() => set('semester', s)} style={{
                        padding: '8px 14px', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s',
                        border: `1.5px solid ${form.semester === s ? '#6366f1' : '#e5e7eb'}`,
                        background: form.semester === s ? 'rgba(99,102,241,0.06)' : '#fff',
                        color: form.semester === s ? '#6366f1' : '#6b7280',
                      }}>
                        {s} Sem
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{
                  padding: '13px 20px', borderRadius: '12px',
                  border: '1.5px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                  ← Back
                </button>
                <button onClick={handleRegister} disabled={loading} style={{
                  flex: 1, padding: '13px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px'
                }}>
                  {loading ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Creating account...
                    </>
                  ) : 'Create Account 🎓'}
                </button>
              </div>
            </div>
          )}

          {/* Login link */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', margin: '1.5rem 0 0' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>

        <p style={{ position: 'absolute', bottom: '1.5rem', fontSize: '11px', color: '#d1d5db' }}>
          🔒 Secured with Supabase Auth · bcrypt encrypted · TLS 1.3
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div style={{
        width: '460px', flexShrink: 0,
        background: 'linear-gradient(160deg, #6366f1 0%, #4338ca 50%, #312e81 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}/>
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }}/>

        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: '16px',
            padding: '20px', marginBottom: '2rem',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', fontWeight: 500 }}>
              OPTI SCORE™ — LIVE PREVIEW
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#fff', letterSpacing: '-2px' }}>
              87<span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>/100</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {['DBMS', 'OS', 'DSA', 'Math'].map((s, i) => (
                <div key={s} style={{
                  flex: 1, background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '8px 6px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{s}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: ['#10b981','#f59e0b','#6366f1','#10b981'][i] }}>
                    {['A','B+','A+','A'][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', letterSpacing: '-0.4px', lineHeight: 1.3 }}>
            Join 500+ students making smarter academic decisions
          </h2>

          {[
            '✅ Free forever for students',
            '✅ Local AI — your data never leaves',
            '✅ Personalized for your semester & subjects',
            '✅ Risk alerts 3 weeks before exams',
          ].map(t => (
            <div key={t} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginBottom: '10px', fontWeight: 500 }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        input::placeholder { color: #d1d5db; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #fff inset !important;
          -webkit-text-fill-color: #111827 !important;
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}