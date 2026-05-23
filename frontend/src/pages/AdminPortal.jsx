import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Activity, Database, Cpu, 
  AlertTriangle, Trash2, CheckCircle2, XCircle, 
  RefreshCw, Server, Lock
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function AdminPortal() {
  const { user, profile } = useAuthStore();
  
  // Diagnostic States
  const [dbLatency, setDbLatency] = useState(0);
  const [flaskHealth, setFlaskHealth] = useState(null);
  const [isPinging, setIsPinging] = useState(true);
  const [isWiping, setIsWiping] = useState(false);

  const runDiagnostics = async () => {
    setIsPinging(true);
    
    // 1. Ping Supabase (Database)
    const startTime = performance.now();
    try {
      await supabase.from('academic_records').select('id').limit(1);
      setDbLatency(Math.round(performance.now() - startTime));
    } catch (e) {
      setDbLatency(-1);
    }

    // 2. Ping Flask (Machine Learning Engine)
    try {
      const res = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/health`, { method: 'GET' });
      const data = await res.json();
      setFlaskHealth(data);
    } catch (e) {
      setFlaskHealth({ status: 'offline' });
    }

    setIsPinging(false);
  };

  useEffect(() => {
    runDiagnostics();
    // Run diagnostics every 30 seconds automatically
    const interval = setInterval(runDiagnostics, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── THE DANGER ZONE (Wipe User Data) ──
  const handleWipeData = async () => {
    const confirmed = window.confirm("WARNING: This will permanently delete all your Study Tasks and Pomodoro Sessions. Your Finance and Academic Records will be kept safe. Proceed?");
    if (!confirmed) return;

    setIsWiping(true);
    try {
      // Because we have RLS, this only deletes the logged-in user's data
      await supabase.from('study_tasks').delete().eq('student_id', user.id);
      await supabase.from('study_sessions').delete().eq('student_id', user.id);
      
      toast.success("Temporary session data wiped successfully.");
    } catch (err) {
      toast.error("Data wipe failed: " + err.message);
    } finally {
      setIsWiping(false);
    }
  };

  const animContainer = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900 pb-20">
      
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">System Admin Portal</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Infrastructure diagnostics and security controls.</p>
        </div>
        <button 
          onClick={runDiagnostics}
          disabled={isPinging}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors max-w-max"
        >
          <RefreshCw size={16} className={isPinging ? 'animate-spin text-indigo-600' : ''} /> 
          {isPinging ? 'Pinging Nodes...' : 'Refresh Diagnostics'}
        </button>
      </motion.div>

      <motion.div variants={animContainer} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl">
        
        {/* LEFT COLUMN: DIAGNOSTICS */}
        <div className="lg:col-span-8 space-y-8">
          
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Activity className="text-indigo-600"/> Live Infrastructure Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supabase Status */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                {dbLatency !== -1 ? <Database size={40} className="text-emerald-100" /> : <Database size={40} className="text-rose-100" />}
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">PostgreSQL Cloud (Supabase)</span>
                <div className="flex items-center gap-3 mb-2">
                  {dbLatency !== -1 ? <CheckCircle2 className="text-emerald-500" size={24} /> : <XCircle className="text-rose-500" size={24} />}
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">{dbLatency !== -1 ? 'Connected' : 'Offline'}</h4>
                </div>
                {dbLatency !== -1 && (
                  <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Read/Write Latency: <span className="text-slate-900">{dbLatency}ms</span>
                  </p>
                )}
              </div>
            </div>

            {/* Python Flask Status */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                {flaskHealth?.status === 'healthy' ? <Cpu size={40} className="text-indigo-100" /> : <Server size={40} className="text-rose-100" />}
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Local ML Engine (Flask)</span>
                <div className="flex items-center gap-3 mb-2">
                  {flaskHealth?.status === 'healthy' ? <CheckCircle2 className="text-indigo-600" size={24} /> : <XCircle className="text-rose-500" size={24} />}
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">{flaskHealth?.status === 'healthy' ? 'Online' : 'Disconnected'}</h4>
                </div>
                {flaskHealth?.status === 'healthy' && (
                  <p className="text-sm font-bold text-slate-500 flex flex-col gap-1 mt-4">
                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-indigo-600"/> Scikit-Learn Random Forest: {flaskHealth.model_loaded ? 'Loaded' : 'Missing'}</span>
                    <span className="flex items-center gap-1.5"><Activity size={14} className="text-indigo-600"/> API Version: {flaskHealth.version}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Neural Engine Raw Response */}
          <div className="bg-slate-900 p-6 rounded-[2rem] shadow-lg text-slate-300 font-mono text-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />
             <div className="flex items-center justify-between mb-4 relative z-10">
               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Terminal Log // 127.0.0.1:5000</span>
               <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">CORS Configured</span>
             </div>
             <pre className="whitespace-pre-wrap leading-relaxed relative z-10 overflow-x-auto text-xs">
{flaskHealth ? JSON.stringify(flaskHealth, null, 2) : 'Awaiting heartbeat signal...'}
             </pre>
          </div>

        </div>

        {/* RIGHT COLUMN: SECURITY & DANGER ZONE */}
        <div className="lg:col-span-4 space-y-6">
          
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Lock className="text-slate-700"/> Security Profile</h3>
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Authenticated Account</span>
              <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
            </div>
            
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Access Role</span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                {user?.role || 'Authenticated'}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Row Level Security (RLS)</span>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Database queries are currently scoped strictly to <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-bold">auth.uid()</code>. Other tenants cannot access this namespace.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Assigned DB UUID</span>
              <p className="text-[10px] font-mono text-slate-400 break-all bg-slate-50 p-2 rounded-lg border border-slate-200">
                {user?.id}
              </p>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-base font-black tracking-tight text-rose-700 flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Danger Zone</h3>
            <p className="text-xs font-medium text-rose-600/80 mb-6 leading-relaxed">
              Instantly wipe all temporary data (Study Planner tasks and Pomodoro sessions) to prepare for a new semester. This action cannot be undone.
            </p>
            <button 
              onClick={handleWipeData}
              disabled={isWiping}
              className="w-full flex justify-center items-center gap-2 bg-white border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-600 px-5 py-3 rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <Trash2 size={16} /> 
              {isWiping ? 'Wiping Tables...' : 'Wipe Temporary Data'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}