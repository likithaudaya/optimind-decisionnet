import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Mock data (replaced with real API later) ──
const subjects = [
  { name: 'Data Structures',    code: 'DSA',  marks: 82, attendance: 91, assignments: 88, risk: 'Low',    predicted: 'A',  trend: '+4' },
  { name: 'DBMS',               code: 'DBMS', marks: 64, attendance: 72, assignments: 60, risk: 'High',   predicted: 'C+', trend: '-3' },
  { name: 'Operating Systems',  code: 'OS',   marks: 75, attendance: 85, assignments: 78, risk: 'Medium', predicted: 'B+', trend: '+1' },
  { name: 'Computer Networks',  code: 'CN',   marks: 88, attendance: 95, assignments: 92, risk: 'Low',    predicted: 'A+', trend: '+6' },
  { name: 'Mathematics',        code: 'MATH', marks: 70, attendance: 78, assignments: 65, risk: 'Medium', predicted: 'B',  trend: '-1' },
]

const riskConfig = {
  Low:    { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: '✓ Low Risk' },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '⚡ Medium Risk' },
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '⚠ High Risk' },
}

const gradePoints = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 }

function predictGrade(marks, attendance, assignments) {
  const score = marks * 0.5 + attendance * 0.3 + assignments * 0.2
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C+'
  if (score >= 50) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function calcGPA(subjectList) {
  const total = subjectList.reduce((sum, s) => sum + (gradePoints[s.predicted] || 0), 0)
  return (total / subjectList.length).toFixed(2)
}

export default function Intelligence() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedSubject, setSelectedSubject] = useState(subjects[1]) // DBMS default (high risk)
  const [simMarks, setSimMarks] = useState(selectedSubject.marks)
  const [simAttendance, setSimAttendance] = useState(selectedSubject.attendance)
  const [simAssignments, setSimAssignments] = useState(selectedSubject.assignments)
  const [expanded, setExpanded] = useState(null)

  const simGrade = predictGrade(simMarks, simAttendance, simAssignments)
  const simSubjects = subjects.map(s =>
    s.code === selectedSubject.code
      ? { ...s, predicted: simGrade }
      : s
  )
  const currentGPA = calcGPA(subjects)
  const simGPA = calcGPA(simSubjects)
  const gpaDiff = (simGPA - currentGPA).toFixed(2)

  const card = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const tab = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '8px 16px', borderRadius: '10px', fontSize: '13px',
        fontWeight: activeTab === id ? 600 : 400,
        background: activeTab === id ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
        color: activeTab === id ? '#fff' : '#6b7280',
        border: activeTab === id ? 'none' : '1px solid #e5e7eb',
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: '6px',
        boxShadow: activeTab === id ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
      }}
    >{icon} {label}</button>
  )

  const slider = (label, value, setter, color = '#6366f1') => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>
          {value}<span style={{ color: '#9ca3af', fontWeight: 400 }}>/100</span>
        </span>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={e => setter(Number(e.target.value))}
        style={{ width: '100%', accentColor: color, height: '4px', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: '#d1d5db' }}>0</span>
        <span style={{ fontSize: '10px', color: '#d1d5db' }}>100</span>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: '#111827', background: '#f8f9fc', minHeight: '100vh' }}>

      {/* ── Top bar ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '16px 28px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
            Intelligence Hub
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
            AI-powered predictions · What-If simulations · Risk analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Risk summary pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px',
            background: '#fef2f2', border: '1px solid #fecaca'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}/>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>1 High Risk Subject</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── Tab navigation ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {tab('overview',   'Risk Overview',    '🎯')}
          {tab('simulator',  'What-If Simulator','🧪')}
          {tab('forecast',   'Attendance Forecast','📅')}
          {tab('effort',     'Effort vs Impact', '📊')}
        </div>

        {/* ══════════════════════════════════════
            TAB 1 — Risk Overview
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div>
            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: 'Current GPA', value: currentGPA, sub: 'Based on predicted grades', icon: '🎓', color: '#6366f1', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.2)' },
                { label: 'Subjects at Risk', value: `${subjects.filter(s=>s.risk!=='Low').length}`, sub: `${subjects.filter(s=>s.risk==='High').length} high · ${subjects.filter(s=>s.risk==='Medium').length} medium`, icon: '⚠️', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                { label: 'Safe Subjects', value: `${subjects.filter(s=>s.risk==='Low').length}`, sub: 'On track for top grade', icon: '✅', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
              ].map(k => (
                <div key={k.label} style={{ ...card, border: `1px solid ${k.border}`, background: k.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: k.color, margin: '0 0 8px', letterSpacing: '0.05em' }}>{k.label.toUpperCase()}</p>
                      <div style={{ fontSize: '36px', fontWeight: 800, color: k.color, letterSpacing: '-1.5px', lineHeight: 1 }}>{k.value}</div>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0' }}>{k.sub}</p>
                    </div>
                    <div style={{ fontSize: '28px' }}>{k.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subject risk cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '14px' }}>
              {subjects.map((s, i) => {
                const rc = riskConfig[s.risk]
                const isOpen = expanded === i
                return (
                  <div key={i} style={{
                    ...card,
                    border: `1px solid ${isOpen ? rc.color : '#e5e7eb'}`,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                    onClick={() => setExpanded(isOpen ? null : i)}
                    onMouseEnter={e => { if(!isOpen) e.currentTarget.style.borderColor = rc.color+'66' }}
                    onMouseLeave={e => { if(!isOpen) e.currentTarget.style.borderColor = '#e5e7eb' }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                            borderRadius: '6px', background: rc.bg,
                            color: rc.color, border: `1px solid ${rc.border}`
                          }}>{s.code}</span>
                          <span style={{ fontSize: '10px', color: s.trend.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {s.trend.startsWith('+') ? '↑' : '↓'} {s.trend} pts
                          </span>
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>{s.name}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: rc.color, letterSpacing: '-0.5px' }}>{s.predicted}</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>predicted</div>
                      </div>
                    </div>

                    {/* Risk badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                      borderRadius: '20px', background: rc.bg,
                      color: rc.color, border: `1px solid ${rc.border}`,
                      marginBottom: '12px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: rc.color }}/>
                      {rc.label}
                    </div>

                    {/* Mini stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                      {[
                        { label: 'Marks', value: s.marks, max: 100, color: s.marks >= 75 ? '#10b981' : s.marks >= 60 ? '#f59e0b' : '#ef4444' },
                        { label: 'Attendance', value: s.attendance, max: 100, color: s.attendance >= 75 ? '#10b981' : '#ef4444' },
                        { label: 'Assignments', value: s.assignments, max: 100, color: s.assignments >= 75 ? '#10b981' : s.assignments >= 60 ? '#f59e0b' : '#ef4444' },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: m.color }}>{m.value}%</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{m.label}</div>
                          <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '99px' }}>
                            <div style={{ width: `${m.value}%`, height: '100%', background: m.color, borderRadius: '99px' }}/>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded AI suggestion */}
                    {isOpen && (
                      <div style={{
                        marginTop: '12px', padding: '12px',
                        background: 'rgba(99,102,241,0.04)',
                        border: '1px solid rgba(99,102,241,0.15)',
                        borderRadius: '10px'
                      }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', margin: '0 0 6px' }}>
                          🧠 Cortex AI Suggestion
                        </p>
                        {s.risk === 'High' && (
                          <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                            Your {s.name} attendance is critically low at {s.attendance}%. Attend the next <b>3 consecutive labs</b> to avoid condonation. Spend at least <b>2 hours daily</b> on practice problems to lift marks above 75.
                          </p>
                        )}
                        {s.risk === 'Medium' && (
                          <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                            You're borderline on {s.name}. A focused <b>revision of 2 key topics</b> this week could push your predicted grade from {s.predicted} to the next level. Try the What-If simulator to see exactly how.
                          </p>
                        )}
                        {s.risk === 'Low' && (
                          <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                            You're performing excellently in {s.name}! Maintain your current study pace. Consider helping peers — teaching reinforces your own understanding.
                          </p>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedSubject(s); setSimMarks(s.marks); setSimAttendance(s.attendance); setSimAssignments(s.assignments); setActiveTab('simulator') }}
                          style={{
                            marginTop: '10px', padding: '7px 14px',
                            background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                            border: 'none', borderRadius: '8px', color: '#fff',
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                          }}>
                          Simulate improvement →
                        </button>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: '#d1d5db' }}>
                      {isOpen ? '▲ Click to collapse' : '▼ Click for AI advice'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — What-If Simulator
        ══════════════════════════════════════ */}
        {activeTab === 'simulator' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>

            {/* Left — controls */}
            <div>
              <div style={card}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>What-If Simulator</h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>
                  Drag sliders to model decisions before making them
                </p>

                {/* Subject picker */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '8px' }}>
                    Select subject to simulate
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {subjects.map(s => (
                      <button key={s.code} onClick={() => { setSelectedSubject(s); setSimMarks(s.marks); setSimAttendance(s.attendance); setSimAssignments(s.assignments) }}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', textAlign: 'left',
                          border: `1.5px solid ${selectedSubject.code === s.code ? '#6366f1' : '#e5e7eb'}`,
                          background: selectedSubject.code === s.code ? 'rgba(99,102,241,0.06)' : '#fff',
                          cursor: 'pointer', transition: 'all 0.15s',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: selectedSubject.code === s.code ? '#6366f1' : '#374151' }}>
                          {s.name}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px',
                          background: riskConfig[s.risk].bg, color: riskConfig[s.risk].color,
                          border: `1px solid ${riskConfig[s.risk].border}`
                        }}>{s.risk}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '0 0 14px' }}>
                    Adjust variables for <span style={{ color: '#6366f1' }}>{selectedSubject.name}</span>
                  </p>
                  {slider('Internal Marks', simMarks, setSimMarks, '#6366f1')}
                  {slider('Attendance %', simAttendance, setSimAttendance, '#10b981')}
                  {slider('Assignment Score', simAssignments, setSimAssignments, '#f59e0b')}
                </div>

                {/* Reset */}
                <button onClick={() => { setSimMarks(selectedSubject.marks); setSimAttendance(selectedSubject.attendance); setSimAssignments(selectedSubject.assignments) }}
                  style={{
                    width: '100%', padding: '10px',
                    border: '1px solid #e5e7eb', background: '#fff',
                    borderRadius: '10px', fontSize: '13px', color: '#6b7280',
                    cursor: 'pointer', fontWeight: 500
                  }}>
                  ↩ Reset to current values
                </button>
              </div>
            </div>

            {/* Right — results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* GPA impact */}
              <div style={{
                ...card,
                background: Number(gpaDiff) > 0 ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : Number(gpaDiff) < 0 ? 'linear-gradient(135deg,#fef2f2,#fee2e2)' : '#fff',
                border: `1px solid ${Number(gpaDiff) > 0 ? '#bbf7d0' : Number(gpaDiff) < 0 ? '#fecaca' : '#e5e7eb'}`
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', margin: '0 0 12px', letterSpacing: '0.04em' }}>GPA IMPACT</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Current GPA</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>{currentGPA}</div>
                  </div>
                  <div style={{ fontSize: '24px', color: '#9ca3af' }}>→</div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Simulated GPA</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: Number(gpaDiff) > 0 ? '#10b981' : Number(gpaDiff) < 0 ? '#ef4444' : '#111827' }}>{simGPA}</div>
                  </div>
                  <div style={{
                    padding: '10px 16px', borderRadius: '12px',
                    background: Number(gpaDiff) > 0 ? '#10b981' : Number(gpaDiff) < 0 ? '#ef4444' : '#6b7280',
                    color: '#fff', fontSize: '18px', fontWeight: 800
                  }}>
                    {Number(gpaDiff) > 0 ? '+' : ''}{gpaDiff}
                  </div>
                </div>
              </div>

              {/* Subject grade result */}
              <div style={card}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', margin: '0 0 14px', letterSpacing: '0.04em' }}>
                  GRADE PREDICTION — {selectedSubject.name.toUpperCase()}
                </p>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Current</div>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '16px',
                      background: '#f3f4f6', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '24px', fontWeight: 800, color: '#374151'
                    }}>{selectedSubject.predicted}</div>
                  </div>
                  <div style={{ fontSize: '20px', color: '#d1d5db' }}>→</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Simulated</div>
                    <div style={{
                      width: '64px', height: '64px', borderRadius: '16px',
                      background: simGrade === selectedSubject.predicted ? '#f3f4f6' :
                        gradePoints[simGrade] > gradePoints[selectedSubject.predicted] ? '#f0fdf4' : '#fef2f2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: 800,
                      color: simGrade === selectedSubject.predicted ? '#374151' :
                        gradePoints[simGrade] > gradePoints[selectedSubject.predicted] ? '#10b981' : '#ef4444',
                      border: `2px solid ${simGrade === selectedSubject.predicted ? '#e5e7eb' :
                        gradePoints[simGrade] > gradePoints[selectedSubject.predicted] ? '#bbf7d0' : '#fecaca'}`
                    }}>{simGrade}</div>
                  </div>
                  <div style={{ flex: 1, padding: '12px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '12px', color: '#374151', margin: 0, lineHeight: 1.6 }}>
                      {gradePoints[simGrade] > gradePoints[selectedSubject.predicted]
                        ? `🎉 With these improvements, your grade rises from ${selectedSubject.predicted} to ${simGrade}. This is achievable!`
                        : gradePoints[simGrade] < gradePoints[selectedSubject.predicted]
                        ? `⚠ If these metrics drop, your grade falls from ${selectedSubject.predicted} to ${simGrade}. Take action now.`
                        : `Your grade stays at ${simGrade}. Try increasing marks or attendance to see improvement.`}
                    </p>
                  </div>
                </div>

                {/* All subjects predicted grades */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', margin: '0 0 10px', letterSpacing: '0.04em' }}>
                    ALL SUBJECTS — SIMULATED OUTCOME
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {simSubjects.map(s => (
                      <div key={s.code} style={{
                        padding: '10px 14px', borderRadius: '10px',
                        background: s.code === selectedSubject.code ? 'rgba(99,102,241,0.06)' : '#f9fafb',
                        border: `1px solid ${s.code === selectedSubject.code ? 'rgba(99,102,241,0.3)' : '#e5e7eb'}`,
                        textAlign: 'center', minWidth: '70px'
                      }}>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{s.code}</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: riskConfig[s.risk].color }}>{s.predicted}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action plan */}
              <div style={{ ...card, background: 'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(79,70,229,0.02))', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', margin: '0 0 10px' }}>
                  🧠 AI Action Plan for {selectedSubject.name}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    simMarks < 75 && `📚 Increase internal marks by ${75 - simMarks} points — focus on past paper questions`,
                    simAttendance < 75 && `📅 Attendance is critically low — attend every class for the next ${Math.ceil((75 * 20 - simAttendance * 20) / (100 - simAttendance))} sessions`,
                    simAssignments < 70 && `📝 Submit pending assignments — even partial credit helps your score`,
                    simMarks >= 75 && simAttendance >= 75 && '✅ You are on track! Maintain consistency to secure this grade.',
                  ].filter(Boolean).map((tip, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', background: '#fff',
                      borderRadius: '8px', border: '1px solid #e5e7eb',
                      fontSize: '12px', color: '#374151', lineHeight: 1.5
                    }}>{tip}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — Attendance Forecast
        ══════════════════════════════════════ */}
        {activeTab === 'forecast' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px' }}>
              {subjects.map((s, i) => {
                const classesHeld = 40
                const attended = Math.round(s.attendance * classesHeld / 100)
                const remaining = 20
                const minToPass = Math.ceil(0.75 * (classesHeld + remaining) - attended)
                const canSkip = remaining - minToPass
                const onTrack = s.attendance >= 75
                return (
                  <div key={i} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{s.name}</h3>
                        <span style={{ fontSize: '11px', color: riskConfig[s.risk].color, fontWeight: 600 }}>
                          {riskConfig[s.risk].label}
                        </span>
                      </div>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: onTrack ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${onTrack ? '#bbf7d0' : '#fecaca'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '22px', fontWeight: 800,
                        color: onTrack ? '#10b981' : '#ef4444'
                      }}>{s.attendance}%</div>
                    </div>

                    {/* Attendance bar */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Current: {attended}/{classesHeld} classes</span>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Min: 75%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '99px', position: 'relative' }}>
                        <div style={{ width: `${s.attendance}%`, height: '100%', borderRadius: '99px', background: onTrack ? '#10b981' : '#ef4444', transition: 'width 0.5s' }}/>
                        {/* 75% marker */}
                        <div style={{ position: 'absolute', left: '75%', top: '-3px', width: '2px', height: '14px', background: '#6b7280', borderRadius: '1px' }}/>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{remaining}</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af' }}>Classes left</div>
                      </div>
                      {onTrack ? (
                        <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>{canSkip}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>Can skip safely</div>
                        </div>
                      ) : (
                        <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>{minToPass}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>Must attend</div>
                        </div>
                      )}
                    </div>

                    {!onTrack && (
                      <div style={{ marginTop: '10px', padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', color: '#ef4444', fontWeight: 500 }}>
                        ⚠ Attend next {minToPass} classes without missing any to avoid condonation
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 4 — Effort vs Impact
        ══════════════════════════════════════ */}
        {activeTab === 'effort' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
            <div style={card}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Effort vs Impact Matrix</h2>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 20px' }}>
                Which subject gives the highest return on your study time?
              </p>

              {/* Quadrant chart */}
              <div style={{ position: 'relative', height: '340px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fafafa' }}>
                {/* Quadrant labels */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '10px', color: '#d1d5db', fontWeight: 600 }}>HIGH IMPACT / LOW EFFORT</div>
                <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', color: '#d1d5db', fontWeight: 600, textAlign: 'right' }}>HIGH IMPACT / HIGH EFFORT</div>
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '10px', color: '#d1d5db', fontWeight: 600 }}>LOW IMPACT / LOW EFFORT</div>
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '10px', color: '#d1d5db', fontWeight: 600, textAlign: 'right' }}>LOW IMPACT / HIGH EFFORT</div>

                {/* Center lines */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#e5e7eb' }}/>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e5e7eb' }}/>

                {/* Axis labels */}
                <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#9ca3af' }}>← Study Hours (Effort) →</div>
                <div style={{ position: 'absolute', left: '4px', top: '50%', transform: 'rotate(-90deg) translateX(-50%)', fontSize: '10px', color: '#9ca3af', transformOrigin: 'left center', whiteSpace: 'nowrap' }}>← Grade Impact →</div>

                {/* Subject dots */}
                {[
                  { ...subjects[0], effort: 30, impact: 75 },
                  { ...subjects[1], effort: 70, impact: 45 },
                  { ...subjects[2], effort: 55, impact: 60 },
                  { ...subjects[3], effort: 25, impact: 85 },
                  { ...subjects[4], effort: 65, impact: 55 },
                ].map((s, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${s.effort}%`,
                    bottom: `${s.impact}%`,
                    transform: 'translate(-50%, 50%)',
                    zIndex: 2
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: riskConfig[s.risk].color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: '#fff',
                      border: '2px solid #fff',
                      boxShadow: `0 2px 8px ${riskConfig[s.risk].color}66`,
                      cursor: 'pointer', transition: 'transform 0.15s'
                    }}
                      title={`${s.name}: ${s.effort}h effort, ${s.impact}% impact`}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >{s.code}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insight panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>📊 Priority Ranking</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>
                  Based on effort invested vs grade improvement potential
                </p>
                {[
                  { subject: 'DBMS', insight: 'High effort, low return. Needs targeted strategy — not just more hours.', priority: 1, color: '#ef4444' },
                  { subject: 'Mathematics', insight: 'Moderate effort, moderate return. A focused push yields good gains.', priority: 2, color: '#f59e0b' },
                  { subject: 'OS', insight: 'Balanced. Slightly more attendance would improve grade significantly.', priority: 3, color: '#f59e0b' },
                  { subject: 'DSA', insight: 'Low effort needed, high return. You are efficient here.', priority: 4, color: '#10b981' },
                  { subject: 'Networks', insight: 'Best performer. Minimal time investment, top grades.', priority: 5, color: '#10b981' },
                ].map(r => (
                  <div key={r.subject} style={{
                    display: 'flex', gap: '10px', padding: '10px',
                    borderRadius: '10px', background: '#f9fafb',
                    border: '1px solid #e5e7eb', marginBottom: '8px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: r.color, color: '#fff',
                      fontSize: '11px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>{r.priority}</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>{r.subject}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>{r.insight}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                ...card,
                background: 'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(79,70,229,0.02))',
                border: '1px solid rgba(99,102,241,0.15)'
              }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1', margin: '0 0 8px' }}>💡 Smart Recommendation</p>
                <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, margin: 0 }}>
                  You're spending the most time on DBMS but getting the least return. Try switching to <b>active recall</b> and <b>practice problems</b> instead of re-reading notes — this typically improves scores 2× faster.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        input[type=range]::-webkit-slider-thumb { cursor: pointer; }
      `}</style>
    </div>
  )
}