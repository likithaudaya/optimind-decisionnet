import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, CheckCircle, Play, 
  Pause, RotateCcw, Plus, Trash2, ChevronDown
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Planner() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Timer States
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 Minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusScore, setFocusScore] = useState(85);
  const [sessionNotes, setSessionNotes] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task States
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ subject: '', topic: '', duration: '30m', priority: 'Medium' });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  
  // Custom Dropdown State
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('study_tasks').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [user]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      toast.success("Pomodoro Complete! Take a break.");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.subject || !newTask.topic) return toast.error("Subject and Topic required");
    setIsAddingTask(true);
    try {
      const { error } = await supabase.from('study_tasks').insert({ student_id: user.id, ...newTask });
      if (error) throw error;
      setNewTask({ subject: '', topic: '', duration: '30m', priority: 'Medium' });
      fetchTasks();
      toast.success("Task added to queue!");
    } catch (err) { toast.error(err.message); } finally { setIsAddingTask(false); }
  };

  const toggleTask = async (task) => {
    try {
      const { error } = await supabase.from('study_tasks').update({ done: !task.done }).eq('id', task.id);
      if (error) throw error;
      fetchTasks();
    } catch (err) { toast.error("Failed to update task"); }
  };

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase.from('study_tasks').delete().eq('id', id);
      if (error) throw error;
      fetchTasks();
    } catch (err) { toast.error("Failed to delete task"); }
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('study_sessions').insert({
        student_id: user.id, subject: selectedSubject, duration_minutes: Math.round((1500 - timerSeconds) / 60) || 25, focus_score: focusScore, notes: sessionNotes
      });
      if (error) throw error;
      toast.success("Focus session logged successfully!");
      setSessionNotes(''); setTimerSeconds(1500); setIsTimerRunning(false);
    } catch (err) { toast.error(err.message); } finally { setIsSubmitting(false); }
  };

  const animContainer = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Study Planner</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Pomodoro focus engine and task queue.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 max-w-max self-start md:self-auto">
          {[{ id: 'tasks', label: 'Task Queue' }, { id: 'focus', label: 'Focus Engine' }].map((tab) => (
            <button
              key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-2.5 text-xs font-bold transition-all uppercase tracking-wider ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {activeTab === tab.id && <motion.div layoutId="activePlannerTab" className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-100" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── TAB 1: TASK QUEUE ── */}
        {activeTab === 'tasks' && (
          <motion.div key="tasks" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Add Task Form */}
            <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 self-start">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2"><Plus className="text-indigo-600"/> New Task</h3>
              
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject</label>
                  <input type="text" placeholder="e.g. DBMS" value={newTask.subject} onChange={e => setNewTask({...newTask, subject: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Topic / Description</label>
                  <input type="text" placeholder="e.g. Read Chapter 4" value={newTask.topic} onChange={e => setNewTask({...newTask, topic: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Est. Duration</label>
                    <input type="text" placeholder="30m" value={newTask.duration} onChange={e => setNewTask({...newTask, duration: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  
                  {/* CUSTOM PRIORITY DROPDOWN */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Priority</label>
                    <div 
                      onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      {newTask.priority}
                      <ChevronDown size={16} className={`text-slate-400 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    <AnimatePresence>
                      {isPriorityOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="absolute top-[105%] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          {['High', 'Medium', 'Low'].map(p => (
                            <div 
                              key={p} 
                              onClick={() => { setNewTask({...newTask, priority: p}); setIsPriorityOpen(false); }}
                              className="p-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors"
                            >
                              {p}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                </div>
                <button type="submit" disabled={isAddingTask} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 text-sm mt-2">
                  {isAddingTask ? 'Adding...' : 'Add to Queue'}
                </button>
              </form>
            </div>

            {/* Task List */}
            <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black tracking-tight mb-6">Current Queue</h3>
              
              {loadingTasks ? (
                <div className="animate-pulse text-slate-400 text-sm font-bold">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500 font-bold">No tasks in your queue.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className={`p-5 rounded-[1.5rem] border flex items-center justify-between transition-all ${task.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}>
                      <div className="flex items-center gap-5">
                        <button onClick={() => toggleTask(task)} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-indigo-500'}`}>
                          <CheckCircle size={16} />
                        </button>
                        <div>
                          <h4 className={`text-base font-bold tracking-tight ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.topic}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">{task.subject}</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1"><Clock size={10}/> {task.duration}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {!task.done && (
                           <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                             task.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : task.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                           }`}>{task.priority}</span>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-white hover:bg-rose-50 rounded-xl">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: FOCUS ENGINE ── */}
        {activeTab === 'focus' && (
          <motion.div key="focus" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="max-w-2xl mx-auto space-y-6">
            
            {/* The Timer */}
            <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-10" />
              
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-8 relative z-10">Pomodoro Engine</span>
              
              <div className="text-[7rem] leading-none font-black text-slate-900 tracking-tighter mb-12 font-mono relative z-10">
                {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}<span className="text-slate-300 mx-2">:</span>{String(timerSeconds % 60).padStart(2, '0')}
              </div>

              <div className="flex justify-center gap-6 relative z-10">
                <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-20 h-20 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all">
                  {isTimerRunning ? <Pause size={32} /> : <Play size={32} className="ml-1.5" />}
                </button>
                <button onClick={() => { setIsTimerRunning(false); setTimerSeconds(1500); }} className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <RotateCcw size={28} />
                </button>
              </div>
            </div>

            {/* Save Session Form */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black tracking-tight mb-6">Log Session Record</h3>
              <form onSubmit={handleSaveSession} className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject</label>
                    <input type="text" placeholder="e.g. DBMS" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Focus Score (0-100)</label>
                    <input type="number" min="0" max="100" value={focusScore} onChange={e => setFocusScore(Number(e.target.value))} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Notes</label>
                  <textarea rows="2" value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="What did you accomplish?" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-100 mt-2">
                  {isSubmitting ? 'Logging to Database...' : 'Save Focus Record'}
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}