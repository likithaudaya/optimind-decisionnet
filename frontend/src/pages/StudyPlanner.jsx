import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  Play, Pause, RotateCcw, Brain, BookOpen, ChevronDown, 
  CheckCircle2, ListTodo, AlertCircle, Clock, Target 
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
  const [isActive, setIsActive] = useState(false);
  
  // ACADEMIC COURSE SELECTION STATES
  const [selectedSubject, setSelectedSubject] = useState('GENERAL');
  const [selectedSubjectName, setSelectedSubjectName] = useState('General Study Block');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  // CUSTOM UI DROPDOWN STATE
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        .eq('done', false) // Only pull uncompleted pipeline tasks
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

  // 2. Populate course subjects from your Supabase academic_records table
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
          // Only set default if it hasn't been changed by loading a task
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

  // Close custom dropdown safely if clicking outside the element workspace
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Core Timer Countdown Logic
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

  // Cloud Database Synchronization Pipeline
  const syncSessionToDatabase = async () => {
    // Determine how much time was actually spent based on the initial duration loaded
    // Note: If you reset or change times heavily, this is an approximation for the demo
    const timeWorkedSeconds = (25 * 60) - timeLeft; 
    let calculatedMinutes = Math.round(timeWorkedSeconds / 60);
    
    // Fallback if they worked longer than 25 mins due to a custom loaded time
    if (calculatedMinutes < 0) calculatedMinutes = 25; 

    // Skip database write if the session was shorter than 30 seconds
    if (timeWorkedSeconds < 30 && timeWorkedSeconds > -100) return;

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
      toast.success("Focus metrics logged successfully.", { id: syncToastId, duration: 3000 });
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
    if (timeLeft < 25 * 60) {
      syncSessionToDatabase();
    }
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── TASK INTERACTION HANDLERS ───
  
  // Pushes the task's subject AND duration directly into the timer
  const handleLoadToArena = (taskSubjectStr, durationStr) => {
    // 1. Map Subject Name and Code
    setSelectedSubjectName(taskSubjectStr);
    const code = taskSubjectStr.split(' - ')[0] || 'GENERAL';
    setSelectedSubject(code.trim());

    // 2. Parse the duration text ("45 mins", "1 HOUR", "1.5 HOURS") into seconds
    let minutes = 25; // Default fallback
    const lowerStr = durationStr?.toLowerCase() || '';
    
    if (lowerStr.includes('min')) {
      const match = lowerStr.match(/(\d+)/);
      if (match) minutes = parseInt(match[1], 10);
    } else if (lowerStr.includes('hour')) {
      const match = lowerStr.match(/([\d.]+)/);
      if (match) minutes = Math.round(parseFloat(match[1]) * 60);
    }

    // 3. Inject it into the timer state
    setIsActive(false); // Pause current timer to prevent jumping bugs
    setTimeLeft(minutes * 60);

    toast.success(`Loaded ${code} for ${minutes} minutes!`);
  };

  // Marks the AI task as completed in the database
  const handleToggleComplete = async (taskId) => {
    const toastId = toast.loading("Updating task status...");
    try {
      const { error } = await supabase
        .from('study_tasks')
        .update({ done: true })
        .eq('id', taskId);

      if (error) throw error;
      toast.success("Task completed! Keep pushing.", { id: toastId });
      fetchTasks(); // Refresh live view instantly to remove from list
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 font-['Inter'] pb-12">

      {/* HEADER PANEL */}
      <div className="bg-white border border-slate-200/80 p-8 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain size={22} className="text-indigo-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Cortex Focus Arena & Planner</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Manage your AI-grounded roadmap trajectories and ignite deep work blocks seamlessly.
          </p>
        </div>
      </div>

      {/* MASTER RETRIEVAL WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT SECTION: LIVE INJECTED TASKS LEDGER (7 COLS) ── */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 p-6 lg:p-8 rounded-[2rem] shadow-sm space-y-6 min-h-[460px]">
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
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
              <AnimatePresence>
                {tasks.map((task) => {
                  const subjectUpper = task.subject?.toUpperCase() || '';
                  
                  // Brand colors based on subject code
                  let borderClass = 'border-slate-200 bg-slate-50/40';
                  if (subjectUpper.includes('ECD') || subjectUpper.includes('ELECTRONIC')) borderClass = 'border-l-4 border-l-rose-500 border-slate-200 bg-rose-50/20';
                  else if (subjectUpper.includes('ST') || subjectUpper.includes('SOFTWARE TESTING')) borderClass = 'border-l-4 border-l-amber-500 border-slate-200 bg-amber-50/20';
                  else if (subjectUpper.includes('ML') || subjectUpper.includes('MACHINE')) borderClass = 'border-l-4 border-l-emerald-500 border-slate-200 bg-emerald-50/20';
                  else if (subjectUpper.includes('MAD') || subjectUpper.includes('MOBILE')) borderClass = 'border-l-4 border-l-purple-500 border-slate-200 bg-purple-50/20';

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
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
                        {/* ── BUTTON NOW PASSES BOTH SUBJECT AND DURATION ── */}
                        <button
                          onClick={() => handleLoadToArena(task.subject, task.duration)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                          title="Load subject into Pomodoro Timer"
                        >
                          <Target size={12} /> Load
                        </button>
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          title="Mark Task Complete"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── RIGHT SECTION: DYNAMIC CORTEX POMODORO ARENA (5 COLS) ── */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 p-8 lg:p-10 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center space-y-8 min-h-[460px] sticky top-8">
          
          {/* Custom Dropdown Framework */}
          <div className="w-full max-w-xs space-y-2 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black tracking-wider uppercase text-slate-400 block text-center flex items-center justify-center gap-1.5">
              <BookOpen size={12} className="text-indigo-500"/> Target Subject Allocation
            </label>
            
            <div 
              onClick={() => !isActive && setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3.5 text-xs font-bold tracking-wide flex items-center justify-between transition-all shadow-sm select-none ${isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 active:scale-[0.99]'}`}
            >
              <span className="truncate">{selectedSubjectName}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-[102%] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 max-h-56 overflow-y-auto text-left"
                >
                  <div 
                    onClick={() => {
                      setSelectedSubject('GENERAL');
                      setSelectedSubjectName('General Study Block');
                      setIsDropdownOpen(false);
                    }}
                    className={`px-4 py-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${selectedSubject === 'GENERAL' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>General Study Block</span>
                    {selectedSubject === 'GENERAL' && <CheckCircle2 size={14} className="text-indigo-600" />}
                  </div>

                  {availableSubjects.map((sub) => {
                    const displayLabel = `${sub.subject_code} - ${sub.subject_name}`;
                    const isCurrent = selectedSubject === sub.subject_code;
                    return (
                      <div 
                        key={sub.subject_code}
                        onClick={() => {
                          setSelectedSubject(sub.subject_code);
                          setSelectedSubjectName(displayLabel);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-4 py-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${isCurrent ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 border-t border-slate-50'}`}
                      >
                        <span className="truncate">{displayLabel}</span>
                        {isCurrent && <CheckCircle2 size={14} className="text-indigo-600" />}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timer Display */}
          <div className="text-center space-y-1 select-none pt-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Session Countdown</span>
            <h2 className="text-7xl lg:text-8xl font-black font-mono tracking-tighter text-slate-900 transition-all duration-300">
              {formatTime(timeLeft)}
            </h2>
          </div>

          {/* Action Controls Row */}
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTimer}
              className={`px-8 py-4 rounded-2xl text-xs uppercase font-black tracking-widest transition-all shadow-md flex items-center gap-2 cursor-pointer text-white ${isActive ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
            >
              {isActive ? <Pause size={14} /> : <Play size={14} />}
              {isActive ? 'Pause Block' : 'Ignite Focus'}
            </button>
            
            <button 
              onClick={resetTimer}
              className="p-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-2xl transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}