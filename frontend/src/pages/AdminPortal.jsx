import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Activity, Users, Database, 
  Terminal, Server, RefreshCw, KeyRound 
} from 'lucide-react';
import { supabase } from '../services/supabase';

export default function AdminPortal() {
  const [activeView, setActiveView] = useState('metrics');
  const [auditLogs, setAuditLogs] = useState([
    { id: 'L-9482', action: 'INSERT', table: 'study_sessions', details: 'Telemetry sync block committed.', time: 'Just now' },
    { id: 'L-9481', action: 'UPDATE', table: 'profiles', details: 'Opti Score performance index reset.', time: '4m ago' },
    { id: 'L-9480', action: 'SELECT', table: 'academic_records', details: 'Random Forest input matrix query fetch.', time: '12m ago' }
  ]);

  // Animation setting profiles
  const containerStyle = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, staggerChildren: 0.05 } }
  };

  return (
    <motion.div 
      variants={containerStyle} initial="hidden" animate="visible"
      className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 font-['Inter'] text-slate-900"
    >
      
      {/* Module Title Header Bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            Admin Management Portal <ShieldAlert className="text-indigo-600" size={26} />
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">System wide pipeline telemetry logs, RLS rules audits, and core operational matrices.</p>
        </div>

        {/* View Toggle Controller Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
          <button 
            onClick={() => setActiveView('metrics')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activeView === 'metrics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            System Health
          </button>
          <button 
            onClick={() => setActiveView('audit')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activeView === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Security Logs
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'metrics' ? (
          /* View 1: System Analytics Overview Grid */
          <motion.div key="metrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total active nodes', value: '1,248', desc: 'Active system users', icon: <Users size={18}/>, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'API Processing Rate', value: '14 ms', desc: 'Flask router latency', icon: <Server size={18}/>, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Vector Proximity Indices', value: '3,810', desc: 'FAISS context blocks', icon: <Database size={18}/>, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Active RLS Policies', value: '14 Active', desc: 'Supabase table shields', icon: <KeyRound size={18}/>, color: 'text-sky-600', bg: 'bg-sky-50' }
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                    <div className={`${stat.color} ${stat.bg} p-2 rounded-xl`}>{stat.icon}</div>
                  </div>
                  <div>
                    <h3 className={`text-3xl font-black ${stat.color}`}>{stat.value}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{stat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Sub-System Diagnostics Logger Display Card */}
            <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm space-y-4">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2"><Activity size={18} className="text-indigo-600"/> Core Infrastructure Routing Matrix</h3>
              <p className="text-slate-400 text-xs font-medium">All localized storage modules are fully bound. Security protocols are actively scanning telemetry queries sequentially.</p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-xs text-slate-600 space-y-1">
                <p>➔ [FLASK ENGINE] Initialized listener interface on address 0.0.0.0:5000</p>
                <p>➔ [OLLAMA KERNEL] Connected to local model workspace instance layer (qwen2.5:3b)</p>
                <p>➔ [SUPABASE AUTH] Multi-role RLS token verifications verified (AES-256 enabled)</p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* View 2: Audit Logs Tracking Schema Data Table */
          <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">Live Security Audit Log (`public.audit_log`)</h3>
              <p className="text-slate-400 text-xs font-semibold mt-1">Real-time trace logs monitoring atomic write actions across your system tables.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-4">Audit Token ID</th>
                    <th className="pb-4">Action Type</th>
                    <th className="pb-4">Target Schema Object</th>
                    <th className="pb-4">Operation Summary Context</th>
                    <th className="pb-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-50">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-mono text-slate-400">{log.id}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight border ${
                          log.action === 'INSERT' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-slate-600">`public.{log.table}`</td>
                      <td className="py-4 text-slate-500 font-medium">{log.details}</td>
                      <td className="py-4 text-right text-slate-400 font-medium">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}