import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle, Play, 
  Pause, RotateCcw, Award, Flame, Zap, Plus 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Planner() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('tasks');
  const [timerSeconds, setTimerSeconds] = useState(1500); // Default 25 Minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('DBMS');
  const [focusScore, setFocusScore] = useState(85);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic array simulating your reinforcement learning reward engine
  const [tasks, setTasks] = useState([
    { id: 1, subject: 'DBMS', topic: 'Indexing & B+ Trees', duration: '45m', priority: 'Critical', done: false, reward: 120 },
    { id: 2, subject: 'Data Structures', topic: 'Graph Cycles via DFS', duration: '60m', priority: 'High', done: false, reward: 150 },
    { id: 3, subject: 'Operating Systems', topic: 'Page Fault Allocations', duration: '30m', priority: 'Medium', done: true, reward: 90 },
    { id: 4, subject: 'Computer Networks', topic: 'TCP 3-Way Handshake Protocols', duration: '40m', priority: 'Low', done: false, reward: 80 }
  ]);

  // Pomodoro Timer Logic Core
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      toast.success("Focus block completed! Log your study session session below.");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Commits transaction operations straight to public.study_sessions database schema table
  const handleLogStudySession = async (e) => {
    if (e) e.preventDefault();
    if (!user) return toast.error("Active user context missing.");

    setIsSubmitting(true);
    const durationMinutes = Math.round((1500 - timerSeconds) / 60) || 25;

    try {
      const { error } = await supabase
        .from('study_sessions')
        .insert({
          student_id: user.id,
          subject: selectedSubject,
          duration_minutes: durationMinutes,
          focus_score: focusScore,
          notes: sessionNotes || "Pomodoro completion run log segment."
        });

      if (error) throw error;

      toast.success("Session telemetry safely committed to Supabase!");
      setSessionNotes('');
      setTimerSeconds(1500); // Reset clock bounds
    } catch (err) {
      toast.error(`Database commit failure: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      {/* Dynamic Module Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">RL Study Planner</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Adaptive Q-Learning Schedule Optimization & Session Logs.</p>
        </div>

        {/* Tab Interface Nav Controls */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Priority Queue
          </button>
          <button 
            onClick={() => setActiveTab('pomodoro')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activeTab === 'pomodoro' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Pomodoro Engine
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tasks' ? (
          <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Task Registry Queue Column */}
            <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">RL-Reshuffled Task Priority Stream</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1">The scheduler updates utility value curves and sorts operations based on dynamic performance gradients.</p>
              </div>

              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${task.done ? 'bg-slate-50/80 border-slate-200/60 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={task.done} 
                        onChange={() => setTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                        className="w-5 h-5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{task.topic}</span>
                          <span className="text-[10px] font-black uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-600">{task.subject}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1"><Clock size={12}/> Target Block Allocation: {task.duration}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">+{task.reward} XP</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1 uppercase tracking-tight">{task.priority} Weight</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gamification Metric Index Column */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block"><Award className="inline mr-1" size={14}/> Academic Gamification Profile</span>
                <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                  <Flame className="text-orange-500 fill-orange-500 animate-pulse" size={32} />
                  <div>
                    <h4 className="text-2xl font-black text-slate-900">5 Days</h4>
                    <span className="text-xs font-bold text-slate-500">Continuous Logging Streak Index</span>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        ) : (
          /* Pomodoro Engine Execution Interface Panel Sub-View */
          <motion.div key="pomo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Visual Countdown System Terminal */}
            <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center flex flex-col justify-center items-center space-y-8">
              <div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Workspace Core Timer</span>
              </div>
              <h2 className="text-7xl font-black tracking-tighter text-slate-900 font-mono select-none">{formatTime(timerSeconds)}</h2>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsTimerRunning(!isTimerRunning)} 
                  className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md flex items-center gap-2 transition-all ${isTimerRunning ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
                >
                  {isTimerRunning ? <Pause size={16}/> : <Play size={16}/>} {isTimerRunning ? 'Pause Engine' : 'Start Focus Run'}
                </button>
                <button 
                  onClick={() => { setIsTimerRunning(false); setTimerSeconds(1500); }} 
                  className="p-3 border border-slate-200 hover:border-slate-300 bg-white rounded-xl text-slate-500 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {/* Right Column: Database Storage Logger Management Terminal Form */}
            <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <form onSubmit={handleLogStudySession} className="space-y-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">Commit Focus Analytics to Supabase</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1">Saves active parameters directly to your live running database relational schema configurations.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Subject Context</label>
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-sm outline-none bg-white">
                      <option>DBMS</option>
                      <option>DSA</option>
                      <option>OS</option>
                      <option>CN</option>
                      <option>MATH</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Self-Evaluated Focus Score</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Zap size={16} className="text-indigo-600"/>
                      <input type="number" min="0" max="100" value={focusScore} onChange={e => setFocusScore(Number(e.target.value))} className="w-full bg-transparent font-black text-sm outline-none"/>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Focus Session Review Notes</label>
                  <textarea rows="3" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="Topics finalized, problem sets analyzed, model delta notes..." className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-all" />
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Pushing Session Telemetry...' : 'Write Record to public.study_sessions'}
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}