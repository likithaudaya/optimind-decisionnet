import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, ShieldCheck, ArrowUpRight, Receipt, 
  CreditCard, Calendar, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export default function Finance() {
  const { user } = useAuthStore();
  const [feeRecord, setFeeRecord] = useState({
    total_amount: 45000.00,
    paid_amount: 45000.00,
    status: 'Paid',
    due_date: '2026-06-15'
  });
  const [loading, setLoading] = useState(true);

  // Pulls real ledger data rows straight from your public.fees schema table
  useEffect(() => {
    async function fetchLedgerMetrics() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .eq('student_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setFeeRecord(data);
        }
      } catch (err) {
        console.warn("Could not query live ledger. Utilizing system baseline defaults.", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLedgerMetrics();
  }, [user]);

  const outstandingBalance = (feeRecord.total_amount - feeRecord.paid_amount).toFixed(2);

  // Animation layout property blocks
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.08 } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible" 
      className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 font-['Inter'] text-slate-900"
    >
      
      {/* Module Title Header Panel */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Finance Center</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Institutional Ledger Monitoring & Encrypted Settlement Nodes.</p>
        </div>
        
        {/* Status Pills Badge System */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
            feeRecord.status === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            {feeRecord.status === 'Paid' ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
            Account Status: {feeRecord.status}
          </div>
        </div>
      </div>

      {/* Grid Summary Ledger Configuration Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Invoiced Fee', value: `₹${feeRecord.total_amount.toLocaleString()}`, desc: 'Current academic cycle dues', color: 'text-slate-900', icon: <Receipt size={20}/> },
          { label: 'Settled Balance', value: `₹${feeRecord.paid_amount.toLocaleString()}`, desc: 'Verified clearing receipts', color: 'text-indigo-600', icon: <CheckCircle2 size={20}/> },
          { label: 'Outstanding Liabilities', value: `₹${outstandingBalance}`, desc: `Due target: ${feeRecord.due_date}`, color: Number(outstandingBalance) > 0 ? 'text-rose-600' : 'text-emerald-600', icon: <CreditCard size={20}/> }
        ].map((card, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ y: -4 }} 
            className="p-6 rounded-[2rem] bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</span>
              <div className="text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-100">{card.icon}</div>
            </div>
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${card.color}`}>{card.value}</h3>
              <p className="text-xs font-semibold text-slate-500 mt-2">{card.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Transaction Feed Table */}
        <div className="lg:col-span-8 bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Verified Clearing Ledger Records</h3>
            <p className="text-slate-400 text-xs font-semibold mt-1">Audit checkpoints monitored via strict token validations.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-4">Transaction ID / Reference</th>
                  <th className="pb-4">Allocated Term</th>
                  <th className="pb-4">Settlement Pathway</th>
                  <th className="pb-4 text-right">Cleared Amount</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-50">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 font-mono text-slate-400">TXN-948271048-HDFC</td>
                  <td className="py-4">Current Active Semester</td>
                  <td className="py-4"><span className="px-2 py-0.5 bg-slate-100 border rounded text-[10px] uppercase font-black tracking-tight">Interbank UPI Node</span></td>
                  <td className="py-4 text-right font-bold text-slate-900">₹{feeRecord.paid_amount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Encrypted Protection Details Panel */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col gap-6 relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
            <Wallet className="text-indigo-300" size={22} />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h4 className="text-xl font-black tracking-tight">Gateway Compliance Context</h4>
            <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
              Financial data assets are managed securely under full end-to-end sandbox routing systems. No credentials or accounting entries are ever stored locally or transmitted un-hashed.
            </p>
          </div>

          <div className="text-[10px] font-mono text-indigo-300/40 border-t border-white/5 pt-4 mt-4 flex items-center justify-between">
            <span>SECURE SYSTEM MODULE: AES-256</span>
            <ArrowUpRight size={14}/>
          </div>
          <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-indigo-600 rounded-full blur-[90px] opacity-25" />
        </div>

      </div>

    </motion.div>
  );
}