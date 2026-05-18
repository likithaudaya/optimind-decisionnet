import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/authStore'

const mockSubjects = [
  { name: 'Data Structures', marks: 82, attendance: 91, risk: 'Low', grade: 'A' },
  { name: 'DBMS', marks: 64, attendance: 72, risk: 'High', grade: 'C+' },
  { name: 'Operating Systems', marks: 75, attendance: 85, risk: 'Medium', grade: 'B+' },
  { name: 'Computer Networks', marks: 88, attendance: 95, risk: 'Low', grade: 'A+' },
  { name: 'Mathematics', marks: 70, attendance: 78, risk: 'Medium', grade: 'B' },
]

const weeklyStudy = [
  { day: 'Mon', hours: 3.5 },
  { day: 'Tue', hours: 2 },
  { day: 'Wed', hours: 4.5 },
  { day: 'Thu', hours: 1.5 },
  { day: 'Fri', hours: 5 },
  { day: 'Sat', hours: 3 },
  { day: 'Sun', hours: 2.5 },
]

const recentActivity = [
  { icon: '🧠', text: 'Cortex AI suggested 2 extra DBMS labs', time: '2h ago', color: '#6366f1' },
  { icon: '📈', text: 'Opti Score initialized successfully', time: 'Just now', color: '#10b981' },
  { icon: '⚠️', text: 'DBMS attendance below 75% threshold', time: '1d ago', color: '#f59e0b' },
  { icon: '✅', text: 'Completed Networks assignment', time: '1d ago', color: '#10b981' },
  { icon: '🎯', text: 'New study plan generated for this week', time: '2d ago', color: '#6366f1' },
]

const riskColor = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' }
const riskBg = { Low: '#f0fdf4', Medium: '#fffbeb', High: '#fef2f2' }
const riskBorder = { Low: '#bbf7d0', Medium: '#fde68a', High: '#fecaca' }

export default function Dashboard() {
  const navigate = useNavigate()
  
  // We use a local state to force the UI to update the exact moment the data arrives
  const [liveProfile, setLiveProfile] = useState(null)
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState(new Date())
  const maxBar = Math.max(...weeklyStudy.map(d => d.hours))

  useEffect(() => {
    async function secureProfileFetch() {
      // 1. Force React to WAIT for Supabase to securely load the auth token into memory
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 2. Now that the token is active, fetch the profile using the confirmed ID
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (data) {
          setLiveProfile(data); // Instantly updates the text on your screen
          // Updates your global background store so the Planner & Finance pages work too
          useAuthStore.setState({ profile: data, user: session.user });
        }
      }
    }
    secureProfileFetch();
  }, []);

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Safely extract the data or fall back to defaults while loading
  const optiScore = liveProfile?.opti_score ?? 0;
  const firstName = liveProfile?.full_name?.split(' ')[0] ?? 'Student';
  const initial = liveProfile?.full_name?.[0]?.toUpperCase() ?? 'S';

  const scoreColor = optiScore >= 80 ? '#10b981' : optiScore >= 60 ? '#f59e0b' : '#ef4444'
  const scoreBg = optiScore >= 80 ? '#f0fdf4' : optiScore >= 60 ? '#fffbeb' : '#fef2f2'

  const card = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: '#111827', minHeight: '100vh', background: '#f8f9fc' }}>

      {/* ── Top bar ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '16px 28px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
            {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notification bell */}
          <button style={{
            width: '38px', height: '38px', borderRadius: '10px',
            border: '1px solid #e5e7eb', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative'
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{
              position: 'absolute', top: '8px', right: '8px',
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#ef4444', border: '1.5px solid #fff'
            }}/>
          </button>
          {/* Avatar */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer'
          }}>
            {initial}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Row 1: KPI cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>

          {/* Opti Score */}
          <div style={{
            ...card,
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            border: 'none', color: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, opacity: 0.7, margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  OPTI SCORE™
                </p>
                <div style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1 }}>
                  {optiScore}
                  <span style={{ fontSize: '16px', fontWeight: 400, opacity: 0.6 }}>/100</span>
                </div>
                <p style={{ fontSize: '12px', opacity: 0.7, margin: '6px 0 0' }}>Latest recorded score</p>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>🎯</div>
            </div>
            {/* Score bar */}
            <div style={{ marginTop: '16px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px' }}>
              <div style={{ width: `${optiScore}%`, height: '100%', background: '#fff', borderRadius: '99px', transition: 'width 1s ease' }}/>
            </div>
          </div>

          {/* Overall Attendance */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  ATTENDANCE
                </p>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1 }}>
                  84<span style={{ fontSize: '16px', fontWeight: 400, color: '#9ca3af' }}>%</span>
                </div>
                <p style={{ fontSize: '12px', color: '#10b981', margin: '6px 0 0', fontWeight: 500 }}>✓ Above minimum</p>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>📅</div>
            </div>
            <div style={{ marginTop: '16px', height: '4px', background: '#f3f4f6', borderRadius: '99px' }}>
              <div style={{ width: '84%', height: '100%', background: '#10b981', borderRadius: '99px' }}/>
            </div>
          </div>

          {/* Average Marks */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  AVG. MARKS
                </p>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1 }}>
                  75<span style={{ fontSize: '16px', fontWeight: 400, color: '#9ca3af' }}>/100</span>
                </div>
                <p style={{ fontSize: '12px', color: '#f59e0b', margin: '6px 0 0', fontWeight: 500 }}>↑ +3 from last test</p>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: '#fffbeb', border: '1px solid #fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>📊</div>
            </div>
            <div style={{ marginTop: '16px', height: '4px', background: '#f3f4f6', borderRadius: '99px' }}>
              <div style={{ width: '75%', height: '100%', background: '#f59e0b', borderRadius: '99px' }}/>
            </div>
          </div>

          {/* At-risk subjects */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  AT-RISK SUBJECTS
                </p>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1 }}>
                  1<span style={{ fontSize: '16px', fontWeight: 400, color: '#9ca3af' }}> / 5</span>
                </div>
                <p style={{ fontSize: '12px', color: '#ef4444', margin: '6px 0 0', fontWeight: 500 }}>⚠ DBMS needs attention</p>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: '#fef2f2', border: '1px solid #fecaca',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>🚨</div>
            </div>
            <div style={{ marginTop: '16px', height: '4px', background: '#f3f4f6', borderRadius: '99px' }}>
              <div style={{ width: '20%', height: '100%', background: '#ef4444', borderRadius: '99px' }}/>
            </div>
          </div>
        </div>

        {/* ── Row 2: Subjects + Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', marginBottom: '20px' }}>

          {/* Subject table */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Subject Overview</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>Current semester performance</p>
              </div>
              <button
                onClick={() => navigate('/intelligence')}
                style={{
                  fontSize: '12px', fontWeight: 500, color: '#6366f1',
                  background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '8px', padding: '6px 12px', cursor: 'pointer'
                }}>
                View predictions →
              </button>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px 80px',
              gap: '8px', padding: '8px 12px',
              background: '#f9fafb', borderRadius: '10px', marginBottom: '6px'
            }}>
              {['Subject', 'Marks', 'Attendance', 'Grade', 'Risk'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em' }}>{h}</div>
              ))}
            </div>

            {/* Table rows */}
            {mockSubjects.map((s, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px 80px',
                gap: '8px', padding: '12px',
                borderRadius: '10px', alignItems: 'center',
                transition: 'background 0.15s',
                cursor: 'pointer',
                borderBottom: i < mockSubjects.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{s.name}</div>

                {/* Marks with mini bar */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{s.marks}%</div>
                  <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '99px' }}>
                    <div style={{
                      width: `${s.marks}%`, height: '100%', borderRadius: '99px',
                      background: s.marks >= 75 ? '#10b981' : s.marks >= 60 ? '#f59e0b' : '#ef4444'
                    }}/>
                  </div>
                </div>

                {/* Attendance with mini bar */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{s.attendance}%</div>
                  <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '99px' }}>
                    <div style={{
                      width: `${s.attendance}%`, height: '100%', borderRadius: '99px',
                      background: s.attendance >= 75 ? '#10b981' : '#ef4444'
                    }}/>
                  </div>
                </div>

                <div style={{
                  fontSize: '13px', fontWeight: 700,
                  color: s.marks >= 75 ? '#10b981' : s.marks >= 60 ? '#f59e0b' : '#ef4444'
                }}>{s.grade}</div>

                <div style={{
                  fontSize: '11px', fontWeight: 600,
                  color: riskColor[s.risk],
                  background: riskBg[s.risk],
                  border: `1px solid ${riskBorder[s.risk]}`,
                  borderRadius: '6px', padding: '3px 8px',
                  display: 'inline-block'
                }}>{s.risk}</div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={card}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Recent Activity</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>Your latest updates</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {recentActivity.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 8px', borderRadius: '10px',
                  transition: 'background 0.15s', cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '34px', height: '34px', flexShrink: 0,
                    borderRadius: '9px', fontSize: '16px',
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12.5px', color: '#374151', margin: '0 0 2px', lineHeight: 1.4, fontWeight: 500 }}>{a.text}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/cortex')}
              style={{
                width: '100%', marginTop: '12px', padding: '11px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
              🧠 Ask Cortex AI
            </button>
          </div>
        </div>

        {/* ── Row 3: Study chart + Quick actions + Wellness ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: '16px' }}>

          {/* Weekly study bar chart */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Weekly Study Hours</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>This week · 21.5 hrs total</p>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600, color: '#6366f1',
                background: 'rgba(99,102,241,0.08)', borderRadius: '6px',
                padding: '4px 10px'
              }}>This week</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '120px' }}>
              {weeklyStudy.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>{d.hours}h</span>
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    height: `${(d.hours / maxBar) * 90}px`,
                    background: d.day === 'Fri'
                      ? 'linear-gradient(180deg, #6366f1, #4f46e5)'
                      : '#e5e7eb',
                    transition: 'height 0.5s ease',
                    cursor: 'pointer',
                    minHeight: '8px'
                  }}
                    onMouseEnter={e => { if (d.day !== 'Fri') e.currentTarget.style.background = '#c7d2fe' }}
                    onMouseLeave={e => { if (d.day !== 'Fri') e.currentTarget.style.background = '#e5e7eb' }}
                  />
                  <span style={{ fontSize: '11px', color: d.day === 'Fri' ? '#6366f1' : '#9ca3af', fontWeight: d.day === 'Fri' ? 700 : 400 }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={card}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Quick Actions</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>Jump to what matters most</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: '🧠', label: 'Risk Prediction', sub: 'Check at-risk subjects', path: '/intelligence', color: '#6366f1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' },
                { icon: '📅', label: 'Study Planner', sub: 'View today\'s schedule', path: '/planner', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
                { icon: '💬', label: 'Cortex AI', sub: 'Get personalized advice', path: '/cortex', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
                { icon: '💳', label: 'Fee Status', sub: 'Check pending payments', path: '/finance', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
              ].map(a => (
                <button key={a.label} onClick={() => navigate(a.path)} style={{
                  padding: '14px', borderRadius: '12px', textAlign: 'left',
                  border: `1px solid ${a.border}`,
                  background: a.bg, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{a.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: a.color, marginBottom: '2px' }}>{a.label}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{a.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Wellness + Streak */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Study streak */}
            <div style={{
              ...card,
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '1px solid #fcd34d'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '32px' }}>🔥</div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#92400e', letterSpacing: '-1px' }}>7 days</div>
                  <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 500 }}>Study streak — keep it up!</div>
                </div>
              </div>
            </div>

            {/* Today's wellness */}
            <div style={card}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                Today's Wellness Check
              </h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>How are you feeling?</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {['😴', '😟', '😐', '😊', '🤩'].map((emoji, i) => (
                  <button key={i} style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    border: '1.5px solid #e5e7eb', background: '#f9fafb',
                    fontSize: '20px', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.transform = 'scale(1.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.transform = 'scale(1)' }}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            {/* Semester progress */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>Semester Progress</h2>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>68%</span>
              </div>
              <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  width: '68%', height: '100%', borderRadius: '99px',
                  background: 'linear-gradient(90deg, #6366f1, #4f46e5)'
                }}/>
              </div>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0' }}>
                ~6 weeks remaining in this semester
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}