import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell 
} from 'recharts';
import { 
  BrainCircuit, Calculator, AlertCircle, CheckCircle2, 
  BarChart3, Calendar, Activity, Database
} from 'lucide-react';

const riskConfig = {
  Low:    { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: '✓ Low Risk' },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '⚡ Medium Risk' },
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '⚠ High Risk' },
};

const gradePoints = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 };

// Base algorithms for fallback
function predictGradeLocal(marks, attendance, assignments) {
  const score = (marks * 0.5) + (attendance * 0.3) + (assignments * 0.2);
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
  if (!subjectList || subjectList.length === 0) return "0.00";
  const total = subjectList.reduce((sum, s) => sum + (gradePoints[predictGradeLocal(s.marks, s.attendance, s.assignments)] || 0), 0);
  return (total / subjectList.length).toFixed(2);
}

export default function Intelligence() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [expanded, setExpanded] = useState(null);
  
  // LIVE DATABASE STATES
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // SIMULATOR STATES
  const [simMarks, setSimMarks] = useState(0);
  const [simAttendance, setSimAttendance] = useState(0);
  const [simAssignments, setSimAssignments] = useState(0);

  // MACHINE LEARNING STATES
  const [mlPredictedRisk, setMlPredictedRisk] = useState('Evaluating...');
  const [mlConfidence, setMlConfidence] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);

  // 1. FETCH REAL SUBJECTS FROM SUPABASE
  useEffect(() => {
    async function fetchSubjects() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('academic_records')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        setSubjects(data || []);
        if (data && data.length > 0) {
          setSelectedSubject(data[0]); // Default to first subject
        }
      } catch (err) {
        console.error("Failed to load records:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [user]);

  // Sync simulator sliders when subject changes
  useEffect(() => {
    if (selectedSubject) {
      setSimMarks(selectedSubject.marks);
      setSimAttendance(selectedSubject.attendance);
      setSimAssignments(selectedSubject.assignments);
    }
  }, [selectedSubject]);

  // 2. THE PYTHON MACHINE LEARNING PIPELINE
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
        setIsApiConnected(true);
      }
    } catch (err) {
      console.warn("Flask ML API unreachable. Using local heuristic fallback.");
      setIsApiConnected(false);
      // Fallback logic if Python server is off
      const score = (marks * 0.5) + (attendance * 0.3) + (assignments * 0.2);
      setMlPredictedRisk(score < 55 || attendance < 65 ? 'High' : (score < 72 || attendance < 75 ? 'Medium' : 'Low'));
    }
  };

  // Debounce the ML call so it doesn't flood the Python server while sliding
  useEffect(() => {
    if (selectedSubject) {
      const delay = setTimeout(() => {
        fetchLiveMLPrediction(simMarks, simAttendance, simAssignments);
      }, 300); 
      return () => clearTimeout(delay);
    }
  }, [simMarks, simAttendance, simAssignments, selectedSubject]);

  // Math variables
  const currentGPA = useMemo(() => calcGPA(subjects), [subjects]);
  const simGrade = useMemo(() => predictGradeLocal(simMarks, simAttendance, simAssignments), [simMarks, simAttendance, simAssignments]);
  const simGPA = useMemo(() => {
    if (!selectedSubject) return "0.00";
    const updated = subjects.map(s => s.id === selectedSubject.id ? { ...s, marks: simMarks, attendance: simAttendance, assignments: simAssignments } : s);
    return calcGPA(updated);
  }, [simMarks, simAttendance, simAssignments, selectedSubject, subjects]);
  const gpaDiff = (parseFloat(simGPA) - parseFloat(currentGPA)).toFixed(2);

  // Animation variants
  const animContainer = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } } };
  const animItem = { hidden: { opacity: 0, scale: 0.97 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } } };

  // Helper to determine risk for overview cards
  const getSubjectRisk = (m, a, as) => {
    const score = (m * 0.5) + (a * 0.3) + (as * 0.2);
    return (score < 55 || a < 65) ? 'High' : (score < 72 || a < 75 ? 'Medium' : 'Low');
  };

  if (loading) return <div className="p-10 text-slate-500 font-medium animate-pulse">Initializing Neural Matrices...</div>;

  if (subjects.length === 0) return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] flex flex-col items-center justify-center">
      <Database className="text-slate-300 mb-4" size={48} />
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Awaiting Data Streams</h2>
      <p className="text-slate-500 text-sm max-w-md text-center">Your Intelligence Hub requires baseline data to run predictive models. Please add your current semester subjects on the Dashboard first.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Intelligence Hub</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm font-medium">Predictive machine learning matrices & simulation terminals.</p>
            {isApiConnected ? (
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">ML Engine Online</span>
            ) : (
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">Local Math Mode</span>
            )}
          </div>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 max-w-max self-start md:self-auto">
          {[{ id: 'overview', label: 'Risk Overview' }, { id: 'simulator', label: 'What-If Simulator' }, { id: 'forecast', label: 'Attendance Forecast' }, { id: 'effort', label: 'Effort vs Impact' }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {activeTab === tab.id && <motion.div layoutId="activeIntelligenceTab" className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-100" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Current SGPA', value: currentGPA, desc: 'Based on active predicted grades', icon: '🎓', color: 'text-indigo-600', bg: 'bg-indigo-50/60', bColor: 'border-indigo-100' },
                { label: 'Subjects at Risk', value: subjects.filter(s=> getSubjectRisk(s.marks, s.attendance, s.assignments) !== 'Low').length, desc: 'Requires parameter adjustment', icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50/60', bColor: 'border-amber-100' },
                { label: 'Safe Subjects', value: subjects.filter(s=> getSubjectRisk(s.marks, s.attendance, s.assignments) === 'Low').length, desc: 'Optimized progression pipeline metrics', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50/60', bColor: 'border-emerald-100' }
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={animItem} className={`p-6 rounded-[2rem] bg-white border ${kpi.bColor} shadow-sm flex items-center justify-between`}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{kpi.label}</span>
                    <h3 className={`text-4xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-2">{kpi.desc}</p>
                  </div>
                  <div className={`text-4xl p-4 rounded-2xl ${kpi.bg}`}>{kpi.icon}</div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((s, i) => {
                const riskLevel = getSubjectRisk(s.marks, s.attendance, s.assignments);
                const config = riskConfig[riskLevel];
                const grade = predictGradeLocal(s.marks, s.attendance, s.assignments);
                const isExpanded = expanded === i;
                
                return (
                  <motion.div
                    key={s.id} layout variants={animItem}
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-200 shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wider mb-2 inline-block" style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}>
                          {s.subject_code}
                        </span>
                        <h4 className="text-base font-bold text-slate-800 tracking-tight">{s.subject_name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-slate-900 block tracking-tighter" style={{ color: config.color }}>{grade}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Predicted</span>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5" style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
                      {config.label}
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 mb-4">
                      {[{ label: 'Marks', val: s.marks }, { label: 'Att.', val: s.attendance }, { label: 'Assign.', val: s.assignments }].map((bar, bIdx) => (
                        <div key={bIdx} className="space-y-1">
                          <span className="text-sm font-black text-slate-700 block">{bar.val}%</span>
                          <span className="text-[9px] uppercase font-black text-slate-400 tracking-tight block">{bar.label}</span>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${bar.val >= 75 ? 'bg-emerald-500' : bar.val >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${bar.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-3 mt-2">
                            <p className="font-bold text-indigo-600 flex items-center gap-1"><BrainCircuit size={14}/> Cortex Advisory Token</p>
                            <p className="leading-relaxed">
                              {riskLevel === 'High' ? `Your ${s.subject_code} parameters indicate structural risks. Adjusting focus allocation is mathematically required to prevent grade decay.` : 
                               riskLevel === 'Medium' ? `Borderline threshold identified. Moving assignment scores slightly higher will optimize predictive gradient parameters.` : 
                               "Optimal trajectory sustained. Current parameters indicate high resilience indices."}
                            </p>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedSubject(s); setActiveTab('simulator'); }}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors"
                            >
                              Initialize Simulation Run
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: SIMULATOR ── */}
        {activeTab === 'simulator' && selectedSubject && (
          <motion.div key="simulator" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2"><Calculator className="text-indigo-600"/> Setup Simulation</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1">Alter operational variables to trace theoretical delta curves.</p>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Target Curriculum Area</label>
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                  {subjects.map(sub => (
                    <button
                      key={sub.id} onClick={() => setSelectedSubject(sub)}
                      className={`w-full p-4 rounded-xl text-left border flex justify-between items-center transition-all ${selectedSubject.id === sub.id ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <span className={`text-sm font-bold ${selectedSubject.id === sub.id ? 'text-indigo-600' : 'text-slate-700'}`}>{sub.subject_code}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 border text-slate-500 font-mono">{sub.marks}%</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-6">
                {[
                  { label: 'Internal Marks Delta', state: simMarks, setter: setSimMarks, color: 'accent-indigo-600 text-indigo-600 bg-indigo-50' },
                  { label: 'Attendance Track Metric', state: simAttendance, setter: setSimAttendance, color: 'accent-emerald-600 text-emerald-600 bg-emerald-50' },
                  { label: 'Expected Assignment Score', state: simAssignments, setter: setSimAssignments, color: 'accent-amber-600 text-amber-600 bg-amber-50' }
                ].map((sld, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-black tracking-wider uppercase text-slate-500">
                      <span>{sld.label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-sm font-black ${sld.color}`}>{sld.state}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={sld.state} onChange={(e) => sld.setter(Number(e.target.value))} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${sld.color.split(' ')[0]}`} style={{ background: '#f1f5f9' }} />
                  </div>
                ))}
              </div>

              <button 
                onClick={() => { setSimMarks(selectedSubject.marks); setSimAttendance(selectedSubject.attendance); setSimAssignments(selectedSubject.assignments); }}
                className="w-full py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider transition-colors"
              >
                ↩ Flush to Native Values
              </button>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="p-8 rounded-[3rem] border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">SGPA Core Projection</span>
                  <div className="flex items-center gap-6">
                    <div><span className="text-xs text-slate-400 font-bold block mb-1">Baseline</span><h4 className="text-3xl font-black text-slate-400">{currentGPA}</h4></div>
                    <span className="text-2xl text-slate-300 font-black">→</span>
                    <div><span className="text-xs text-indigo-500 font-bold block mb-1">Simulated</span><h4 className="text-4xl font-black text-slate-900">{simGPA}</h4></div>
                  </div>
                </div>
                <div className={`px-5 py-3 rounded-2xl font-black text-xl shadow-sm ${Number(gpaDiff) > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : Number(gpaDiff) < 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                  {Number(gpaDiff) > 0 ? '+' : ''}{gpaDiff} Margin
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Machine Learning Outcome: {selectedSubject.subject_code}</span>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-4 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="text-center flex-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Original</span>
                      <div className="w-14 h-14 bg-white border rounded-xl flex items-center justify-center text-xl font-black text-slate-400 mx-auto">{predictGradeLocal(selectedSubject.marks, selectedSubject.attendance, selectedSubject.assignments)}</div>
                    </div>
                    <span className="text-slate-300 font-black">→</span>
                    <div className="text-center flex-1">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block mb-1">Simulated</span>
                      <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black text-white mx-auto shadow-md shadow-indigo-200">{simGrade}</div>
                    </div>
                  </div>

                  <div className="md:col-span-8 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      The Scikit-Learn Random Forest model evaluates this parameter matrix as <strong className={mlPredictedRisk === 'High' ? 'text-rose-600' : mlPredictedRisk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}>{mlPredictedRisk} Risk</strong>.
                      Adjusting your marks to {simMarks} and attendance to {simAttendance} will result in a {simGrade} profile.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Live Scikit-Learn Predictor Flags</span>
                  <div className="grid grid-cols-3 gap-4">
                    {['Low', 'Medium', 'High'].map((lvl) => (
                      <div key={lvl} className={`p-4 rounded-xl border text-center transition-all ${mlPredictedRisk === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <span className="text-[10px] font-black uppercase tracking-wider block mb-1">{lvl} Risk</span>
                        <span className="text-lg font-black">{mlPredictedRisk === lvl ? 'ACTIVE' : 'IDLE'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 3: FORECAST ── */}
        {activeTab === 'forecast' && (
          <motion.div key="forecast" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {subjects.map((s) => {
                const totalHeld = 40;
                const attended = Math.round((s.attendance * totalHeld) / 100);
                const left = 20;
                const reqToClear = Math.ceil(0.75 * (totalHeld + left) - attended);
                const safeSkip = left - reqToClear;
                const cleared = s.attendance >= 75;

                return (
                  <motion.div key={s.id} variants={animItem} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold tracking-tight text-slate-800">{s.subject_code}</h4>
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
                        <span>Current Ledger: {attended}/{totalHeld} slots</span>
                        <span>Threshold: 75%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        <div className={`h-full ${cleared ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.attendance}%` }} />
                        <div className="absolute left-[75%] top-0 w-0.5 h-full bg-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-lg font-black text-slate-800 block">{left}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">Horizon Track</span>
                      </div>
                      <div className={`p-3 rounded-xl border text-center ${cleared ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <span className={`text-lg font-black block ${cleared ? 'text-emerald-600' : 'text-rose-600'}`}>{cleared ? Math.max(0, safeSkip) : reqToClear}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">{cleared ? 'Permitted Skips' : 'Required Runs'}</span>
                      </div>
                    </div>
                  </motion.div>
                );
             })}
          </motion.div>
        )}

        {/* ── TAB 4: EFFORT VS IMPACT ── */}
        {activeTab === 'effort' && (
          <motion.div key="effort" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Return-on-Effort Quadrant Plot</h3>
                    <p className="text-xs text-slate-400 font-medium">Visualizing data points mapping assignment effort against internal marks impact.</p>
                  </div>
                  
                  <div className="h-[340px] bg-slate-50 rounded-2xl border border-slate-200 p-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis type="number" dataKey="effort" name="Assignments" domain={[0, 100]} hide />
                        <YAxis type="number" dataKey="impact" name="Marks" domain={[0, 100]} hide />
                        <ZAxis type="number" range={[100, 400]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200">
                                <p className="font-black text-indigo-600 text-xs uppercase tracking-wider">{payload[0].payload.name}</p>
                                <p className="text-sm font-bold text-slate-700 mt-1">Marks Impact: {payload[0].payload.impact}%</p>
                                <p className="text-xs text-slate-500 font-medium">Assignment Effort: {payload[0].payload.effort}%</p>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Scatter data={subjects.map(s => ({ name: s.subject_code, effort: s.assignments, impact: s.marks, risk: getSubjectRisk(s.marks, s.attendance, s.assignments) }))}>
                          {subjects.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={riskConfig[getSubjectRisk(entry.marks, entry.attendance, entry.assignments)].color} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                    
                    <div className="absolute top-4 left-4 text-[9px] font-black text-slate-400 tracking-wider">HIGH YIELD / LOW EFFORT</div>
                    <div className="absolute top-4 right-4 text-[9px] font-black text-slate-400 tracking-wider">OPTIMAL / BALANCED AREA</div>
                    <div className="absolute bottom-4 left-4 text-[9px] font-black text-slate-400 tracking-wider">CRITICAL AT-RISK ZONE</div>
                    <div className="absolute bottom-4 right-4 text-[9px] font-black text-slate-400 tracking-wider">HIGH EFFORT / LOW YIELD</div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-400">Strategic Priority Queue</h4>
                  </div>
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                    {subjects.map((item, idx) => {
                      const r = getSubjectRisk(item.marks, item.attendance, item.assignments);
                      return (
                        <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl flex gap-3 items-start shadow-sm">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${riskConfig[r].color.replace('#', 'bg-[')}] flex-shrink-0 mt-0.5`} style={{ backgroundColor: riskConfig[r].color }}>{idx + 1}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block leading-none mb-1">{item.subject_code}</span>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                              {r === 'High' ? 'Critical parameter decay. Re-route study allocations immediately.' : r === 'Medium' ? 'Optimization required on internal matrix.' : 'Parameters stable. Maintain current trajectory.'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        input[type='range']::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: #4f46e5; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(79,70,229,0.2); cursor: pointer; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
      `}</style>
    </div>
  );
}