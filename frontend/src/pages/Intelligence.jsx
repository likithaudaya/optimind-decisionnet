import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts';
import { 
  BrainCircuit, Calculator, TrendingUp, AlertCircle, 
  CheckCircle2, ChevronRight, BarChart3, Calendar, Info
} from 'lucide-react';

// ── Shared Structural Academic Datasets ──
const initialSubjects = [
  { name: 'Data Structures',    code: 'DSA',  marks: 82, attendance: 91, assignments: 88, risk: 'Low',    predicted: 'A',  trend: '+4' },
  { name: 'DBMS',               code: 'DBMS', marks: 64, attendance: 72, assignments: 60, risk: 'High',   predicted: 'C+', trend: '-3' },
  { name: 'Operating Systems',  code: 'OS',   marks: 75, attendance: 85, assignments: 78, risk: 'Medium', predicted: 'B+', trend: '+1' },
  { name: 'Computer Networks',  code: 'CN',   marks: 88, attendance: 95, assignments: 92, risk: 'Low',    predicted: 'A+', trend: '+6' },
  { name: 'Mathematics',        code: 'MATH', marks: 70, attendance: 78, assignments: 65, risk: 'Medium', predicted: 'B',  trend: '-1' },
];

const riskConfig = {
  Low:    { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: '✓ Low Risk' },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '⚡ Medium Risk' },
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '⚠ High Risk' },
};

const gradePoints = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 };

// Baseline fallback prediction matrix matching your structural threshold rules
function predictGradeLocal(marks, attendance, assignments) {
  const score = marks * 0.5 + attendance * 0.3 + assignments * 0.2;
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function calcGPA(subjectList) {
  const total = subjectList.reduce((sum, s) => sum + (gradePoints[s.predicted] || 0), 0);
  return (total / subjectList.length).toFixed(2);
}

export default function Intelligence() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSubject, setSelectedSubject] = useState(initialSubjects[1]); // Default DBMS
  const [expanded, setExpanded] = useState(null);

  // Sliders Operational States
  const [simMarks, setSimMarks] = useState(initialSubjects[1].marks);
  const [simAttendance, setSimAttendance] = useState(initialSubjects[1].attendance);
  const [simAssignments, setSimAssignments] = useState(initialSubjects[1].assignments);

  // Live Machine Learning State Vectors
  const [mlPredictedRisk, setMlPredictedRisk] = useState('High');
  const [mlConfidence, setMlConfidence] = useState(null);

  // Sync state parameters instantly when selected subject changes
  useEffect(() => {
    setSimMarks(selectedSubject.marks);
    setSimAttendance(selectedSubject.attendance);
    setSimAssignments(selectedSubject.assignments);
  }, [selectedSubject]);

  // Hook live machine learning call pipeline execution
  const fetchLiveMLPrediction = async (marks, attendance, assignments) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_marks: marks,
          attendance: attendance,
          assignment_score: assignments
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMlPredictedRisk(data.prediction);
        setMlConfidence(data.confidence_metrics);
      }
    } catch (err) {
      console.warn("Flask server unreachable. Utilizing local prediction algorithms.", err);
    }
  };

  // Trigger continuous telemetry monitoring cycles inside input loops
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLiveMLPrediction(simMarks, simAttendance, simAssignments);
    }, 250); // Debounce payload signals to maintain fluid rendering loops
    return () => clearTimeout(delayDebounce);
  }, [simMarks, simAttendance, simAssignments]);

  // Compute standard grade profiles alongside active matrix loops
  const simGrade = useMemo(() => {
    return predictGradeLocal(simMarks, simAttendance, simAssignments);
  }, [simMarks, simAttendance, simAssignments]);

  const currentGPA = useMemo(() => calcGPA(initialSubjects), []);

  const simGPA = useMemo(() => {
    const updated = initialSubjects.map(s => 
      s.code === selectedSubject.code ? { ...s, predicted: simGrade } : s
    );
    return calcGPA(updated);
  }, [simGrade, selectedSubject]);

  const gpaDiff = (simGPA - currentGPA).toFixed(2);

  // High-End Animation Properties Config Blocks
  const animContainer = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } }
  };

  const animItem = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      {/* ── Dynamic Layout Header ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Intelligence Hub</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Predictive machine learning matrices & raw parameter simulation terminals.</p>
        </div>
        
        {/* Sleek Navigation Bar Slider Background Interaction Layout */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 max-w-max self-start md:self-auto">
          {[
            { id: 'overview', label: 'Risk Overview' },
            { id: 'simulator', label: 'What-If Simulator' },
            { id: 'forecast', label: 'Attendance Forecast' },
            { id: 'effort', label: 'Effort vs Impact' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider ${
                activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeIntelligenceTab" 
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }} 
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        
        {/* ══════════════════════════════════════
            TAB 1 — Risk Overview Layout
        ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
            
            {/* Context KPI Highlights Grid Matrices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Current GPA', value: currentGPA, desc: 'Based on active predicted grades', icon: '🎓', color: 'text-indigo-600', bg: 'bg-indigo-50/60', bColor: 'border-indigo-100' },
                { label: 'Subjects at Risk', value: initialSubjects.filter(s=>s.risk!=='Low').length, desc: `${initialSubjects.filter(s=>s.risk==='High').length} High Risk · ${initialSubjects.filter(s=>s.risk==='Medium').length} Medium Risk`, icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50/60', bColor: 'border-amber-100' },
                { label: 'Safe Subjects', value: initialSubjects.filter(s=>s.risk==='Low').length, desc: 'Optimized progression pipeline metrics', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50/60', bColor: 'border-emerald-100' }
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={animItem} whileHover={{ y: -4 }} className={`p-6 rounded-[2rem] bg-white border ${kpi.bColor} shadow-sm flex items-center justify-between transition-all`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{kpi.label}</span>
                    <h3 className={`text-4xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-2">{kpi.desc}</p>
                  </div>
                  <div className={`text-4xl p-4 rounded-2xl ${kpi.bg}`}>{kpi.icon}</div>
                </motion.div>
              ))}
            </div>

            {/* Core Cards Display Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialSubjects.map((s, i) => {
                const config = riskConfig[s.risk];
                const isExpanded = expanded === i;
                return (
                  <motion.div
                    key={i}
                    layout
                    variants={animItem}
                    whileHover={{ y: isExpanded ? 0 : -5, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.05)" }}
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200/80 hover:border-indigo-200'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wider" style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}>
                            {s.code}
                          </span>
                          <span className={`text-[10px] font-bold ${s.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {s.trend} pts
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-800 tracking-tight">{s.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-slate-900 block tracking-tighter" style={{ color: config.color }}>{s.predicted}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Predicted</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5" style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
                      {config.label}
                    </div>

                    {/* Progress Slider Meter Groups */}
                    <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 mb-4">
                      {[
                        { label: 'Marks', val: s.marks, color: s.marks >= 75 ? 'bg-emerald-500' : s.marks >= 60 ? 'bg-amber-500' : 'bg-rose-500' },
                        { label: 'Attendance', val: s.attendance, color: s.attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500' },
                        { label: 'Assignments', val: s.assignments, color: s.assignments >= 75 ? 'bg-emerald-500' : 'bg-rose-500' }
                      ].map((bar, bIdx) => (
                        <div key={bIdx} className="space-y-1">
                          <span className="text-sm font-black text-slate-700 block">{bar.val}%</span>
                          <span className="text-[9px] uppercase font-black text-slate-400 tracking-tight block">{bar.label}</span>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${bar.val}%` }} transition={{ duration: 0.8 }} className={`h-full ${bar.color}`} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-3">
                            <p className="font-bold text-indigo-600 flex items-center gap-1"><BrainCircuit size={14}/> Cortex Advisory Token</p>
                            <p className="leading-relaxed italic">
                              {s.risk === 'High' && `Your ${s.name} attendance tracking indicates structural risks. Attend the next 3 laboratories to guarantee clearance.`}
                              {s.risk === 'Medium' && `Borderline threshold identified. Moving assignment scores north by 8% optimizes predictive gradient parameters.`}
                              {s.risk === 'Low' && "Optimal trajectory sustained. Current parameters indicate high resilience indices across validation sets."}
                            </p>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubject(s);
                                setActiveTab('simulator');
                              }}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-100 transition-colors"
                            >
                              Initialize Improvement Run
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <p className="text-center text-[10px] text-slate-400 font-bold tracking-wider mt-4">{isExpanded ? '▲ CLICK TO COLLAPSE' : '▼ CLICK FOR CORTEX ADVICE'}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            TAB 2 — What-If Simulator Layout
        ══════════════════════════════════════ */}
        {activeTab === 'simulator' && (
          <motion.div key="simulator" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Variable Adjustment Panel Layout Blocks */}
            <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2"><Calculator className="text-indigo-600"/> Setup Simulation</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1">Alter operational variables to trace theoretical delta curves.</p>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Target Curriculum Area</label>
                <div className="flex flex-col gap-2">
                  {initialSubjects.map(sub => (
                    <button
                      key={sub.code}
                      onClick={() => setSelectedSubject(sub)}
                      className={`w-full p-4 rounded-xl text-left border flex justify-between items-center transition-all ${
                        selectedSubject.code === sub.code ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className={`text-sm font-bold ${selectedSubject.code === sub.code ? 'text-indigo-600' : 'text-slate-700'}`}>{sub.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 border text-slate-500">{sub.risk} Risk</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Range Slider Inputs Configuration Blocks */}
              <div className="border-t border-slate-100 pt-6 space-y-6">
                {[
                  { label: 'Internal Marks Delta', state: simMarks, setter: setSimMarks, color: 'accent-indigo-600 text-indigo-600 bg-indigo-50' },
                  { label: 'Attendance Track Metric', state: simAttendance, setter: setSimAttendance, color: 'accent-emerald-600 text-emerald-600 bg-emerald-50' },
                  { label: 'Assignment Integration Matrix', state: simAssignments, setter: setSimAssignments, color: 'accent-amber-600 text-amber-600 bg-amber-50' }
                ].map((sld, sldIdx) => (
                  <div key={sldIdx} className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-black tracking-wider uppercase text-slate-500">
                      <span>{sld.label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-sm font-black ${sld.color}`}>{sld.state}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={sld.state}
                      onChange={(e) => sld.setter(Number(e.target.value))}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${sld.color.split(' ')[0]}`}
                      style={{ background: '#f1f5f9' }}
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  setSimMarks(selectedSubject.marks);
                  setSimAttendance(selectedSubject.attendance);
                  setSimAssignments(selectedSubject.assignments);
                }}
                className="w-full py-3 border border-slate-200 hover:border-slate-300 rounded-xl bg-white text-slate-500 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                ↩ Flush to Native Values
              </button>
            </div>

            {/* Simulated Live Results Vector Display Columns */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* GPA Tracker Delta Matrix Summary Cards */}
              <div className={`p-8 rounded-[3rem] border shadow-sm transition-all ${Number(gpaDiff) >= 0 ? 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-200' : 'bg-gradient-to-br from-rose-50/40 to-orange-50/20 border-rose-200'}`}>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">SGPA Core Projection Tracking</span>
                <div className="flex items-center gap-8 flex-wrap lg:flex-nowrap">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block mb-1">Baseline Registry</span>
                    <h4 className="text-3xl font-black text-slate-400">{currentGPA}</h4>
                  </div>
                  <span className="text-2xl text-slate-300 font-black">→</span>
                  <div>
                    <span className="text-xs text-slate-500 font-bold block mb-1">Simulated Output</span>
                    <h4 className="text-4xl font-black text-slate-900">{simGPA}</h4>
                  </div>
                  <div className="lg:ml-auto">
                    <span className={`text-xl font-black px-4 py-2 rounded-2xl text-white inline-block shadow-md ${Number(gpaDiff) >= 0 ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}>
                      {Number(gpaDiff) >= 0 ? '+' : ''}{gpaDiff} Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Random Forest Class Outcome Visual Arrays */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Validation Outcome: {selectedSubject.name}</span>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 flex items-center justify-between bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                    <div className="text-center flex-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Original</span>
                      <div className="w-14 h-14 bg-white border rounded-xl flex items-center justify-center text-xl font-black text-slate-400 mx-auto">{selectedSubject.predicted}</div>
                    </div>
                    <span className="text-slate-300 font-black">→</span>
                    <div className="text-center flex-1">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block mb-1">Simulated</span>
                      <motion.div key={simGrade} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black text-white mx-auto shadow-md shadow-indigo-100">{simGrade}</motion.div>
                    </div>
                  </div>

                  <div className="md:col-span-8 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100/50">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {gradePoints[simGrade] > gradePoints[selectedSubject.predicted] 
                        ? `🎉 Parameter scale optimization verified! Your grade profile climbs safely from ${selectedSubject.predicted} up to ${simGrade}. Maintain these target slider curves.`
                        : gradePoints[simGrade] < gradePoints[selectedSubject.predicted]
                        ? `⚠️ Caution: Reducing parameters below current runtime limits will break performance indices and force grade decay cascades to ${simGrade}.`
                        : `Equilibrium state validated. Grade remains locked at ${simGrade}. Push the internal marks or attendance slider further up to unlock positive delta margins.`}
                    </p>
                  </div>
                </div>

                {/* Random Forest Live Probability Array Vectors Inference */}
                <div className="border-t border-slate-100 pt-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Live Random Forest Classifier Confidence Array</span>
                  <div className="grid grid-cols-3 gap-4">
                    {['Low', 'Medium', 'High'].map((lvl) => {
                      const isActive = mlPredictedRisk === lvl;
                      return (
                        <div key={lvl} className={`p-4 rounded-xl border text-center transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider block mb-1">{lvl} Risk Classification</span>
                          <span className="text-lg font-black">{isActive ? 'ACTIVE' : 'DE-ASSERTED'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            TAB 3 — Attendance Forecast Layout
        ══════════════════════════════════════ */}
        {activeTab === 'forecast' && (
          <motion.div key="forecast" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {initialSubjects.map((s, i) => {
                const totalHeld = 40;
                const attended = Math.round((s.attendance * totalHeld) / 100);
                const left = 20;
                const reqToClear = Math.ceil(0.75 * (totalHeld + left) - attended);
                const safeSkip = left - reqToClear;
                const cleared = s.attendance >= 75;

                return (
                  <motion.div key={i} variants={animItem} className="bg-white p-6 rounded-[2.5rem] border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold tracking-tight text-slate-800">{s.name}</h4>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${cleared ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {cleared ? '✓ Bounds Compliant' : '⚠️ Bounds Violation Alert'}
                        </span>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border text-lg ${cleared ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                        {s.attendance}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-400">
                        <span>Current Ledger: {attended}/{totalHeld} periods</span>
                        <span>Threshold: 75%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div className={`h-full ${cleared ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.attendance}%` }} />
                        <div className="absolute left-[75%] top-0 w-0.5 h-full bg-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-50 p-3 rounded-xl border text-center">
                        <span className="text-lg font-black text-slate-800 block">{left}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">Horizon Track</span>
                      </div>
                      <div className={`p-3 rounded-xl border text-center ${cleared ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                        <span className={`text-lg font-black block ${cleared ? 'text-emerald-600' : 'text-rose-600'}`}>{cleared ? safeSkip : reqToClear}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">{cleared ? 'Permitted Skips' : 'Required Runs'}</span>
                      </div>
                    </div>

                    {!cleared && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/60 text-[11px] font-bold text-rose-600 leading-relaxed">
                        ⚠️ Must attend next {reqToClear} consecutive slots to overwrite condonation flags.
                      </div>
                    )}
                  </motion.div>
                );
             })}
          </motion.div>
        )}

        {/* ══════════════════════════════════════
            TAB 4 — Effort vs Impact Layout
        ══════════════════════════════════════ */}
        {activeTab === 'effort' && (
          <motion.div key="effort" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Embedded High-Fidelity Scatter Visuals Matrix Core */}
                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Return-on-Effort Quadrant Plot</h3>
                    <p className="text-xs text-slate-400 font-medium">Visualizing data points mapping hours dedicated against validation yield indices.</p>
                  </div>
                  
                  <div className="h-[340px] bg-slate-50 rounded-2xl border border-slate-100 p-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis type="number" dataKey="effort" name="Effort" domain={[0, 100]} hide />
                        <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 100]} hide />
                        <ZAxis type="number" range={[100, 400]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 font-['Inter']">
                                <p className="font-black text-indigo-600 text-xs uppercase tracking-wider">{payload[0].payload.name} Vector</p>
                                <p className="text-sm font-bold text-slate-700 mt-1">Impact Rating: {payload[0].value}%</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Scatter data={[
                          { name: 'DSA', effort: 30, impact: 75, risk: 'Low' },
                          { name: 'DBMS', effort: 70, impact: 45, risk: 'High' },
                          { name: 'OS', effort: 55, impact: 60, risk: 'Medium' },
                          { name: 'CN', effort: 25, impact: 85, risk: 'Low' },
                          { name: 'MATH', effort: 65, impact: 55, risk: 'Medium' }
                        ]}>
                          {initialSubjects.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={riskConfig[entry.risk].color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    
                    {/* Quadrant System Absolute Label Overlays */}
                    <div className="absolute top-4 left-4 text-[9px] font-black text-slate-300 tracking-wider">HIGH IMPACT / EFFICIENCY UPPER BOUNDS</div>
                    <div className="absolute top-4 right-4 text-[9px] font-black text-slate-300 tracking-wider">CRITICAL HIGH PRESSURE EXECUTION CORE</div>
                    <div className="absolute bottom-4 left-4 text-[9px] font-black text-slate-300 tracking-wider">STABLE LOW PROFILE LATENCY MATRIX</div>
                    <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-300 tracking-wider">LOW IMPACT / ATTENTION OVERHEAD LEAK</div>
                  </div>
                </div>

                {/* Priority Strategy Tracking Index Panels */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-400">Strategic Priority Queue</h4>
                    <p className="text-xs text-slate-400 font-medium">Algorithmic risk sequence mapping optimization directives.</p>
                  </div>

                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                    {[
                      { subject: 'DBMS', insight: 'High absorption overhead observed. Needs shift to active query testing vectors.', priority: 1, color: 'bg-rose-500' },
                      { subject: 'Mathematics', insight: 'Equation structural decay. Weekly formula test interval required.', priority: 2, color: 'bg-amber-500' },
                      { subject: 'OS', insight: 'Isolate process sync mechanics. Core metrics stable.', priority: 3, color: 'bg-amber-500' },
                      { subject: 'DSA', insight: 'High indexing retention rate verified. Low maintenance needed.', priority: 4, color: 'bg-emerald-500' }
                    ].map(item => (
                      <div key={item.subject} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex gap-3 items-start">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${item.color} flex-shrink-0 mt-0.5`}>{item.priority}</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block leading-none mb-1">{item.subject}</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium space-y-1">
                    <span className="font-black text-indigo-600 block uppercase tracking-wider">💡 Strategic Core Optimization Advice</span>
                    <p>Analytical pipelines show elevated resource friction metrics inside <b>DBMS modules</b>. Re-route study allocations from reading passive documents directly into active synthesis patterns immediately.</p>
                  </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Embedded Operational Range Custom Elements Styling Controls */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #4f46e5;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 6px rgba(79,70,229,0.2);
          cursor: pointer;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
      `}</style>
    </div>
  );
}