import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, X, BrainCircuit, Activity, Sparkles, 
  Clock, BookmarkCheck, CalendarDays, AlertTriangle,
  Trash2, Download, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  
  const [liveProfile, setLiveProfile] = useState(profile)
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState(new Date())
  
  // LIVE DATA STATES
  const [subjects, setSubjects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', code: '', marks: '', attendance: '', assignments: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [dynamicOptiScore, setDynamicOptiScore] = useState(0)

  // ─── NEW: FILTERING STATE ───
  const [riskFilter, setRiskFilter] = useState('All')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // ─── STATES FOR THE AI STUDY PLAN TIMELINE ───
  const [timeline, setTimeline] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingTasks, setIsSavingTasks] = useState(false)

  // 1. FETCH REAL DATA FROM SUPABASE & RUN SYNCHRONIZED CALCULATION
  const fetchLiveSubjects = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('academic_records')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true });
      
    if (data) {
      setSubjects(data);
      
      // Calculate dynamic indicators immediately if data records are found
      if (data.length > 0) {
        const totalMarks = data.reduce((acc, s) => acc + (s.marks || 0), 0);
        const totalAttendance = data.reduce((acc, s) => acc + (s.attendance || 0), 0);
        const totalAssignments = data.reduce((acc, s) => acc + (s.assignments || 0), 0);
        
        const calculatedAvgMarks = totalMarks / data.length;
        const calculatedAvgAtt = totalAttendance / data.length;
        const calculatedAvgAss = totalAssignments / data.length;

        // Apply project weighted criteria formula (40% Marks + 30% Attendance + 30% Assignments)
        const computedOptiScore = Math.round(
          (calculatedAvgMarks * 0.4) + 
          (calculatedAvgAtt * 0.3) + 
          (calculatedAvgAss * 0.3)
        );

        setDynamicOptiScore(computedOptiScore);

        // Sync calculation coordinates back down to profiles table asynchronously if different
        if (computedOptiScore !== liveProfile?.opti_score) {
          try {
            await supabase
              .from('profiles')
              .update({ opti_score: computedOptiScore })
              .eq('id', user.id);
          } catch (syncErr) {
            console.error("Database cloud latency sync aborted:", syncErr);
          }
        }
      } else {
        setDynamicOptiScore(0);
      }
    }
    if (error) console.error("Error fetching subjects:", error);
  }

  useEffect(() => {
    fetchLiveSubjects();
    setLiveProfile(profile);
  }, [user, profile]);

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. INSERT NEW REAL SUBJECT TO SUPABASE
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.code) {
      return toast.error("Please fill out the subject name and code.");
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('academic_records')
        .insert({
          student_id: user.id,
          subject_name: newSubject.name,
          subject_code: newSubject.code.toUpperCase(),
          marks: parseInt(newSubject.marks) || 0,
          attendance: parseInt(newSubject.attendance) || 0,
          assignments: parseInt(newSubject.assignments) || 0
        });

      if (error) throw error;
      
      toast.success("Subject safely recorded!");
      setNewSubject({ name: '', code: '', marks: '', attendance: '', assignments: '' });
      setIsModalOpen(false);
      fetchLiveSubjects(); // Instantly calculate new Opti Score and refresh UI!

    } catch (err) {
      toast.error(`Failed to add subject: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  }

  // ─── NEW: DELETE SUBJECT LOGIC ───
  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm("Are you sure you want to delete this academic record?")) return;
    const toastId = toast.loading("Deleting record...");
    try {
      const { error } = await supabase
        .from('academic_records')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;
      toast.success("Record permanently deleted.", { id: toastId });
      fetchLiveSubjects(); // Re-fetch to auto-update OptiScore and tables
    } catch (err) {
      toast.error(`Deletion failed: ${err.message}`, { id: toastId });
    }
  }

  // ─── CALL LOCAL PYTHON AI ENDPOINT TO TRIGGER GENERATION ───
  const handleGenerateTimeline = async () => {
    if (!user?.id) {
      return toast.error("Authentication token loading. Please wait a moment.");
    }
    
    setIsGenerating(true)
    const toastId = toast.loading("Cortex is compiling your data-aware academic risks...")
    
    try {
      const baseUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'
      const response = await fetch(`${baseUrl}/api/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.id })
      })

      if (!response.ok) throw new Error("Backend pipeline optimization failed.")
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setTimeline(data)
        toast.success("7-Day Proactive Timeline generated successfully!", { id: toastId })
      } else {
        throw new Error("Returned structure does not meet standard array dimensions.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to build timeline. Verify that your Flask app.py server is active.", { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── INJECT REC CARD CONTENT DIRECTLY INTO STUDY_TASKS LEDGER ───
  const handleAcceptSchedule = async () => {
    if (timeline.length === 0) return;
    setIsSavingTasks(true);
    const toastId = toast.loading("Injecting schedule items directly to your workspace database...");

    try {
      const tasksToInsert = timeline.map(item => ({
        student_id: user.id,
        subject: item.subject,
        topic: item.topic,
        duration: item.duration,
        priority: item.priority || 'Medium',
        done: false
      }));

      const { error } = await supabase
        .from('study_tasks')
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success("All 7 tasks synchronized with your Study Planner! 🎉", { id: toastId, duration: 4000 });
      setTimeline([]); 
    } catch (err) {
      console.error(err);
      toast.error("Database cloud latency sync aborted. Try again.", { id: toastId });
    } finally {
      setIsSavingTasks(false);
    }
  };

  const calcRisk = (marks, att) => (marks < 60 || att < 75) ? 'High' : (marks < 75 || att < 85) ? 'Medium' : 'Low';
  const calcGrade = (marks) => marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';

  // ─── NEW: FILTERING LOGIC ───
  const filteredSubjects = subjects.filter(sub => {
    if (riskFilter === 'All') return true;
    return calcRisk(sub.marks, sub.attendance) === riskFilter;
  });

  // ─── NEW: PDF GENERATION LOGIC (CLEANED HEADER) ───
  const handleExportPDF = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    printWindow.document.write(`
      <html>
        <head>
          <title>Academic Records Log</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #4f46e5; font-size: 28px; }
            .header h2 { margin: 10px 0 5px 0; color: #334155; font-size: 18px; }
            .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #64748b; }
            .risk-Low { color: #10b981; font-weight: bold; }
            .risk-Medium { color: #f59e0b; font-weight: bold; }
            .risk-High { color: #e11d48; font-weight: bold; }
            .footer { margin-top: 50px; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>OptiMind DecisionNet</h1>
            <h2>Official Academic Performance Log</h2>
            <p>Student Name: <strong>${liveProfile?.full_name || 'Student'}</strong> | Generated On: <strong>${new Date().toLocaleDateString()}</strong></p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Code</th>
                <th>Marks</th>
                <th>Attendance</th>
                <th>Est. Grade</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubjects.map(sub => `
                <tr>
                  <td>${sub.subject_name}</td>
                  <td>${sub.subject_code}</td>
                  <td>${sub.marks}%</td>
                  <td>${sub.attendance}%</td>
                  <td>${calcGrade(sub.marks)}</td>
                  <td class="risk-${calcRisk(sub.marks, sub.attendance)}">${calcRisk(sub.marks, sub.attendance)} Risk</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            OptiMind AI Analysis Engine • Document securely generated from verified database telemetry.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    
    // Slight delay ensures styles render before the print dialog opens
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const avgMarks = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + s.marks, 0) / subjects.length) : 0;
  const avgAtt = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + s.attendance, 0) / subjects.length) : 0;
  const highRiskCount = subjects.filter(s => calcRisk(s.marks, s.attendance) === 'High').length;

  const firstName = liveProfile?.full_name?.split(' ')[0] ?? 'Student';

  return (
    <div className="font-['Inter'] text-slate-900 pb-12 max-w-7xl mx-auto px-1">

      {/* TOP HEADER ELEMENT BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <button
          onClick={handleGenerateTimeline}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 cursor-pointer shadow-md"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Optimizing Variables...
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              Generate AI Study Plan
            </>
          )}
        </button>
      </div>

      {/* ─── 7-DAY VISUAL SUBJECT-BRANDED TIMELINE COMPONENT ─── */}
      <AnimatePresence>
        {timeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white border border-slate-200 rounded-[2rem] p-6 lg:p-8 shadow-sm mb-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-0.5">
                <h2 className="text-base font-black tracking-tight flex items-center gap-2 text-slate-900 uppercase">
                  <BrainCircuit className="text-indigo-600 animate-pulse" size={18} /> Proactive Core Trajectory Schedule
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Cortex system has analyzed your current risk balances and compiled targeted study concepts.
                </p>
              </div>
              
              <button
                onClick={handleAcceptSchedule}
                disabled={isSavingTasks}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-100"
              >
                {isSavingTasks ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : <BookmarkCheck size={14} />}
                Accept & Inject Tasks
              </button>
            </div>

            {/* Timeline Multi-Card Layout Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 pt-1">
              {timeline.map((item, index) => {
                // DYNAMIC SUBJECT BRANDING SELECTION TREE
                const subjectToken = item.subject?.toUpperCase() || '';
                
                let colorClasses = 'border-slate-200 bg-slate-50/40 shadow-sm';
                let badgeClasses = 'bg-slate-200 text-slate-600';

                if (subjectToken.includes('ECD') || subjectToken.includes('ELECTRONIC')) {
                  colorClasses = 'border-rose-300 bg-rose-50/30 ring-1 ring-rose-100/40 shadow-md shadow-rose-50/10';
                  badgeClasses = 'bg-rose-100 text-rose-700 font-bold';
                } else if (subjectToken.includes('ST') || subjectToken.includes('SOFTWARE TESTING')) {
                  colorClasses = 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-100/40 shadow-md shadow-amber-50/10';
                  badgeClasses = 'bg-amber-100 text-amber-700 font-bold';
                } else if (subjectToken.includes('ML') || subjectToken.includes('MACHINE')) {
                  colorClasses = 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-100/40 shadow-md shadow-emerald-50/10';
                  badgeClasses = 'bg-emerald-100 text-emerald-700 font-bold';
                } else if (subjectToken.includes('MAD') || subjectToken.includes('MOBILE')) {
                  colorClasses = 'border-purple-300 bg-purple-50/30 ring-1 ring-purple-100/40 shadow-md shadow-purple-50/10';
                  badgeClasses = 'bg-purple-100 text-purple-700 font-bold';
                }

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    key={index}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative ${colorClasses}`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <CalendarDays size={10} className="text-slate-400" /> {item.day}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${badgeClasses}`}>
                          {item.priority || 'Medium'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900 truncate" title={item.subject}>
                          {item.subject}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-relaxed">
                          {item.topic}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-black uppercase tracking-wider pt-3 mt-4 border-t border-slate-100">
                      <Clock size={10} /> {item.duration || '45 mins'}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI CARDS METRIC PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-lg shadow-indigo-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Opti Score™</p>
          <div className="text-4xl font-black mb-2">{dynamicOptiScore}<span className="text-lg opacity-60 font-medium">/100</span></div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${dynamicOptiScore}%` }} />
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avg Attendance</p>
          <div className="text-3xl font-black text-slate-800">{avgAtt}<span className="text-lg text-slate-400 font-medium">%</span></div>
          <p className={`text-xs font-bold mt-2 ${avgAtt >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {avgAtt >= 75 ? '✓ Above minimum threshold' : '⚠ Below 75% boundary'}
          </p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avg Marks</p>
          <div className="text-3xl font-black text-slate-800">{avgMarks}<span className="text-lg text-slate-400 font-medium">%</span></div>
          <p className="text-xs font-bold mt-2 text-indigo-500">Live aggregated metrics</p>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">High-Risk Subjects</p>
          <div className="text-3xl font-black text-slate-800">{highRiskCount}<span className="text-lg text-slate-400 font-medium"> / {subjects.length}</span></div>
          <p className={`text-xs font-bold mt-2 ${highRiskCount === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {highRiskCount === 0 ? 'All subjects stable' : 'Requires immediate attention'}
          </p>
        </div>
      </div>

      {/* REAL ACADEMIC RECORDS TABLE WITH NEW CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Academic Records</h2>
            <p className="text-sm text-slate-500 font-medium">Your live semester progression data</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdown & PDF Export Button - Unified Structure */}
            <div className="relative">
              {/* Custom Dropdown Trigger */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-slate-200"
              >
                {riskFilter === 'All' ? 'All Risks' : `${riskFilter} Risk`}
              </button>

              {/* Custom Dropdown Menu */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-20">
                  {['All', 'High', 'Medium', 'Low'].map((option) => (
                    <button
                      key={option}
                      onClick={() => { setRiskFilter(option); setIsFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${riskFilter === option ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-slate-600'}`}
                    >
                      {option === 'All' ? 'All Risks' : `${option} Risk`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PDF Export Button - Sharing exact structure with Dropdown */}
            <button
              onClick={handleExportPDF}
              disabled={filteredSubjects.length === 0}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-slate-200 disabled:opacity-50"
            >
              Export PDF Log
            </button>

            {/* Add Subject Button */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-colors"
            >
              <Plus size={16} /> Add Subject
            </button>
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Activity className="mx-auto text-slate-300 mb-3" size={40} />
            <h3 className="text-slate-600 font-bold mb-1">No records found</h3>
            <p className="text-sm text-slate-400">Change your filter or add a new subject to track performance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="pb-4">Subject Name</th>
                  <th className="pb-4">Code</th>
                  <th className="pb-4">Marks</th>
                  <th className="pb-4">Attendance</th>
                  <th className="pb-4">Est. Grade</th>
                  <th className="pb-4">Baseline Risk</th>
                  <th className="pb-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredSubjects.map((sub) => {
                    const risk = calcRisk(sub.marks, sub.attendance);
                    const grade = calcGrade(sub.marks);
                    return (
                      <motion.tr 
                        key={sub.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, backgroundColor: '#fef2f2' }}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-4 text-slate-900 font-bold">{sub.subject_name}</td>
                        <td className="py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-500">{sub.subject_code}</span></td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8">{sub.marks}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${sub.marks >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${sub.marks}%` }} /></div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8">{sub.attendance}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${sub.attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${sub.attendance}%` }} /></div>
                          </div>
                        </td>
                        <td className="py-4 font-black">{grade}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                            risk === 'Low' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                            risk === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                            'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}>
                            {risk}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {/* DELETE BUTTON */}
                          <button 
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD SUBJECT MODAL OVERLAY ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Add New Subject</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Enter your current scores. If you don't know your final marks yet, enter your <strong>expected</strong> or <strong>target</strong> scores to calculate your current risk!</p>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject Name</label>
                <input type="text" placeholder="e.g. Database Management" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject Code</label>
                  <input type="text" placeholder="e.g. DBMS" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Avg. Assignment Score (%)</label>
                  <input type="number" min="0" max="100" placeholder="e.g. 85" value={newSubject.assignments} onChange={e => setNewSubject({...newSubject, assignments: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Marks (0-100)</label>
                  <input type="number" min="0" max="100" placeholder="0" value={newSubject.marks} onChange={e => setNewSubject({...newSubject, marks: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Attendance (0-100)</label>
                  <input type="number" min="0" max="100" placeholder="0" value={newSubject.attendance} onChange={e => setNewSubject({...newSubject, attendance: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
              </div>
              <button type="submit" disabled={isAdding} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl mt-6 transition-colors shadow-md shadow-indigo-100">
                {isAdding ? 'Saving to Database...' : 'Save Academic Record'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}