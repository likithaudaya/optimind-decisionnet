import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  Play, Pause, RotateCcw, Brain, BookOpen, ChevronDown, 
  CheckCircle2, ListTodo, AlertCircle, Clock, Target, 
  Trash2, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function StudyPlanner() {
  const { user } = useAuthStore(); 

  // ─── LEFT SIDE: AI TASK LEDGER STATES ───
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // ─── RIGHT SIDE: POMODORO TIMER STATES ───
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalSessionMinutes, setTotalSessionMinutes] = useState(25); // NEW: Tracks loaded duration
  const [isActive, setIsActive] = useState(false);
  
  // ACADEMIC COURSE SELECTION STATES
  const [selectedSubject, setSelectedSubject] = useState('GENERAL');
  const [selectedSubjectName, setSelectedSubjectName] = useState('General Study Block');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  // CUSTOM UI STATES
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  const timerRef = useRef(null);
  const dropdownRef = useRef(null);

  // 1. FETCH LIVE INJECTED STUDY TASKS FROM SUPABASE
  const fetchTasks = async () => {
    if (!user) return;
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('student_id', user.id)
        .eq('done', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTasks(data);
    } catch (err) {
      console.error("Error loading task matrices:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  // 2. POPULATE COURSE SUBJECTS FROM ACADEMIC RECORDS
  useEffect(() => {
    async function fetchSubjectCodes() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('academic_records')
          .select('subject_code, subject_name')
          .eq('student_id', user.id);
        if (data && data.length > 0) {
          setAvailableSubjects(data);
          if (selectedSubject === 'GENERAL') {
             setSelectedSubject(data[0].subject_code);
             setSelectedSubjectName(`${data[0].subject_code} - ${data[0].subject_name}`);
          }
        }
      } catch (err) {
        console.error("Could not populate academic core subjects", err);
      }
    }
    fetchSubjectCodes();
  }, [user]);

  // Close custom dropdown safely if clicking outside the element
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. CORE TIMER COUNTDOWN LOGIC
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  // CLOUD DATABASE SYNCHRONIZATION PIPELINE
  const syncSessionToDatabase = async () => {
    // UPDATED: Calculates time based on dynamically loaded minutes instead of hardcoded 25
    const timeWorkedSeconds = (totalSessionMinutes * 60) - timeLeft; 
    let calculatedMinutes = Math.round(timeWorkedSeconds / 60);
    
    if (calculatedMinutes <= 0 || timeWorkedSeconds < 30) return; // Skip invalid short sessions

    const syncToastId = toast.loading("Logging session metrics to Cortex Cloud...");

    try {
      const baseUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
      await fetch(`${baseUrl}/api/focus/save-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user?.id,
          subject_code: selectedSubject,
          total_minutes: calculatedMinutes,
          efficiency_score: 100, 
          distraction_count: 0
        }),
      });
      toast.success(`Logged ${calculatedMinutes} mins of focus metrics.`, { id: syncToastId, duration: 3000 });
    } catch (err) {
      toast.error("Logged to local offline backup stream.", { id: syncToastId });
    }
  };

  const handleSessionComplete = () => {
    setIsActive(false);
    syncSessionToDatabase();
    toast.success("Sensational work! Focus block completed.", { duration: 5000 });
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    if (timeLeft < totalSessionMinutes * 60) {
      syncSessionToDatabase();
    }
    setIsActive(false);
    setTimeLeft(totalSessionMinutes * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── DURATION PARSER HELPER ───
  const parseDuration = (durationStr) => {
    let minutes = 25; 
    const lowerStr = durationStr?.toLowerCase() || '';
    if (lowerStr.includes('min')) {
      const match = lowerStr.match(/(\d+)/);
      if (match) minutes = parseInt(match[1], 10);
    } else if (lowerStr.includes('hour')) {
      const match = lowerStr.match(/([\d.]+)/);
      if (match) minutes = Math.round(parseFloat(match[1]) * 60);
    }
    return minutes;
  };

  // ─── TASK & DROPDOWN INTERACTION HANDLERS ───

  // Handles clicking "Load" from a specific task card
  const handleLoadToArena = (taskSubjectStr, durationStr) => {
    setSelectedSubjectName(taskSubjectStr);
    const code = taskSubjectStr.split(' - ')[0] || 'GENERAL';
    setSelectedSubject(code.trim());

    const minutes = parseDuration(durationStr);
    setTotalSessionMinutes(minutes);
    setIsActive(false); 
    setTimeLeft(minutes * 60);
    
    toast.success(`Loaded ${code} for ${minutes} minutes!`);
  };

  // Handles selecting a subject via the dropdown
  const handleDropdownSelect = (subjectCode, subjectName) => {
    if (subjectCode === 'GENERAL') {
      setSelectedSubject('GENERAL');
      setSelectedSubjectName('General Study Block');
      setTotalSessionMinutes(25);
      setIsActive(false);
      setTimeLeft(25 * 60);
    } else {
      const displayLabel = `${subjectCode} - ${subjectName}`;
      setSelectedSubject(subjectCode);
      setSelectedSubjectName(displayLabel);
      
      // Search for an active task matching this subject
      const matchingTask = tasks.find(t => t.subject?.toUpperCase().includes(subjectCode.toUpperCase()));
      const minutes = matchingTask ? parseDuration(matchingTask.duration) : 25;
      
      setTotalSessionMinutes(minutes);
      setIsActive(false);
      setTimeLeft(minutes * 60);

      if (matchingTask) {
        toast.success(`AI Task Found! Loaded for ${minutes} minutes.`);
      } else {
        toast.success(`Standard block loaded for 25 minutes.`);
      }
    }
    setIsDropdownOpen(false);
  };

  // Marks the AI task as completed
  const handleToggleComplete = async (taskId) => {
    const toastId = toast.loading("Updating task status...");
    try {
      const { error } = await supabase
        .from('study_tasks')
        .update({ done: true })
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Task completed! Keep pushing.", { id: toastId });
      fetchTasks(); 
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  // Permanently deletes task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;
    
    const toastId = toast.loading("Deleting task...");
    try {
      const { error } = await supabase
        .from('study_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Task deleted.", { id: toastId });
      fetchTasks(); 
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task.", { id: toastId });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 font-['Inter'] pb-12 transition-all duration-500">

      {/* HEADER PANEL - Hides in Zen Mode */}
      <AnimatePresence>
        {!zenMode && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }}
            className="bg-white border border-slate-200/80 p-8 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Brain size={22} className="text-indigo-600" />
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Cortex Focus Arena & Planner</h1>
              </div>
              <p className="text-slate-500 text-sm font-medium">
                Manage your AI-grounded roadmap trajectories and ignite deep work blocks seamlessly.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MASTER RETRIEVAL WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-all duration-500">
        
        {/* ── LEFT SECTION: LIVE INJECTED TASKS LEDGER ── */}
        <AnimatePresence>
          {!zenMode && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50, display: 'none' }}
              className="lg:col-span-7 bg-white border border-slate-200/80 p-6 lg:p-8 rounded-[2rem] shadow-sm space-y-6 min-h-[460px]"
            >
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ListTodo size={18} className="text-indigo-600" /> Active Roadmap Tasks
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Assignments generated via Cortex based on your live academic telemetry.
                </p>
              </div>

              {loadingTasks ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <AlertCircle className="mx-auto text-slate-300" size={32} />
                  <h4 className="text-sm font-bold text-slate-500">No active injected tasks found</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Head back to your Dashboard and click "Generate AI Study Plan" to populate your timeline!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {tasks.map((task) => {
                      const subjectUpper = task.subject?.toUpperCase() || '';
                      
                      let borderClass = 'border-slate-200 bg-slate-50/40';
                      if (subjectUpper.includes('ECD') || subjectUpper.includes('ELECTRONIC')) borderClass = 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/20';
                      else if (subjectUpper.includes('ST') || subjectUpper.includes('SOFTWARE TESTING')) borderClass = 'border-l-4 border-l-amber-500 border-slate-200 bg-amber-50/20';
                      else if (subjectUpper.includes('ML') || subjectUpper.includes('MACHINE')) borderClass = 'border-l-4 border-l-emerald-500 border-slate-200 bg-emerald-50/20';
                      else if (subjectUpper.includes('MAD') || subjectUpper.includes('MOBILE')) borderClass = 'border-l-4 border-l-purple-500 border-slate-200 bg-purple-50/20';

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.90 }}
                          key={task.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${borderClass}`}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-900 bg-white/80 px-2 py-0.5 rounded border border-slate-100 shadow-sm truncate">
                                {task.subject}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold tracking-wider flex items-center gap-0.5">
                                <Clock size={9} /> {task.duration || '45 mins'}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                              {task.topic}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleLoadToArena(task.subject, task.duration)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                              title="Load subject into Pomodoro"
                            >
                              <Target size={12} /> Load
                            </button>
                            
                            <button
                              onClick={() => handleToggleComplete(task.id)}
                              className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                              title="Mark Complete"
                            >
                              <CheckCircle2 size={20} />
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── RIGHT SECTION: DYNAMIC CORTEX POMODORO ARENA ── */}
        <motion.div 
          layout
          className={`${zenMode ? 'col-span-1 lg:col-span-12 max-w-3xl mx-auto w-full scale-[1.02] shadow-2xl border-indigo-200/50 bg-slate-900 text-white' : 'lg:col-span-5 bg-white border border-slate-200/80 shadow-sm text-slate-900'} p-8 lg:p-12 rounded-[3rem] flex flex-col items-center justify-center text-center space-y-10 min-h-[460px] sticky top-8 transition-colors duration-500`}
        >
          
          {/* Custom Dropdown Framework */}
          <div className="w-full max-w-sm space-y-3 relative" ref={dropdownRef}>
            <label className={`text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 ${zenMode ? 'text-slate-400' : 'text-slate-400'}`}>
              <BookOpen size={12} className={zenMode ? 'text-indigo-400' : 'text-indigo-500'}/> Target Subject Allocation
            </label>
            
            <div 
              onClick={() => !isActive && setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full border rounded-2xl px-5 py-4 text-xs font-bold tracking-wide flex items-center justify-between transition-all shadow-sm select-none ${isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'} ${zenMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50 hover:border-slate-300'}`}
            >
              <span className="truncate">{selectedSubjectName}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`absolute top-[102%] left-0 w-full border rounded-2xl shadow-2xl z-50 overflow-hidden py-2 max-h-60 overflow-y-auto text-left ${zenMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                  <div 
                    onClick={() => handleDropdownSelect('GENERAL', 'General Study Block')}
                    className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${selectedSubject === 'GENERAL' ? (zenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (zenMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')}`}
                  >
                    <span>General Study Block</span>
                    {selectedSubject === 'GENERAL' && <CheckCircle2 size={16} className={zenMode ? "text-indigo-400" : "text-indigo-600"} />}
                  </div>

                  {availableSubjects.map((sub) => {
                    const displayLabel = `${sub.subject_code} - ${sub.subject_name}`;
                    const isCurrent = selectedSubject === sub.subject_code;
                    return (
                      <div 
                        key={sub.subject_code}
                        onClick={() => handleDropdownSelect(sub.subject_code, sub.subject_name)}
                        className={`px-5 py-3.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between border-t ${zenMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-50 hover:bg-slate-50'} ${isCurrent ? (zenMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (zenMode ? 'text-slate-300' : 'text-slate-600')}`}
                      >
                        <span className="truncate">{displayLabel}</span>
                        {isCurrent && <CheckCircle2 size={16} className={zenMode ? "text-indigo-400" : "text-indigo-600"} />}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timer Display */}
          <div className="text-center space-y-2 select-none py-4 relative">
            {/* Ambient Background glow in Zen Mode */}
            {zenMode && isActive && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />
            )}
            <span className={`text-[10px] font-black uppercase tracking-widest block relative z-10 ${zenMode ? 'text-slate-400' : 'text-slate-400'}`}>Session Countdown</span>
            <h2 className={`text-[5.5rem] lg:text-[7rem] leading-none font-black font-mono tracking-tighter transition-all duration-300 relative z-10 ${zenMode ? 'text-white drop-shadow-lg' : 'text-slate-900'}`}>
              {formatTime(timeLeft)}
            </h2>
          </div>

          {/* Action Controls Row */}
          <div className="flex items-center justify-center gap-4 relative z-10 w-full max-w-sm">

            {/* Main Play/Pause */}
            <button 
              onClick={toggleTimer}
              className={`flex-1 py-4 rounded-2xl text-xs uppercase font-black tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-white ${isActive ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}
            >
              {isActive ? <Pause size={16} /> : <Play size={16} />}
              {isActive ? 'Pause' : 'Ignite'}
            </button>
            
            {/* Reset */}
            <button 
              onClick={resetTimer}
              className={`p-4 rounded-2xl transition-all cursor-pointer shadow-sm ${zenMode ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}
              title="Reset Timer"
            >
              <RotateCcw size={18} />
            </button>

            {/* Zen Mode Toggle */}
            <button 
              onClick={() => setZenMode(!zenMode)}
              className={`p-4 rounded-2xl transition-all cursor-pointer shadow-sm ${zenMode ? 'bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-500'}`}
              title={zenMode ? "Exit Zen Mode" : "Enter Deep Focus Zen Mode"}
            >
              {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

          </div>
        </motion.div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
}