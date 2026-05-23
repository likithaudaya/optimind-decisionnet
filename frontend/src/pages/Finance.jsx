import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Receipt, TrendingUp, Plus, 
  CheckCircle2, Clock, ChevronDown, Trash2, Edit3
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Finance() {
  const { user } = useAuthStore();
  
  // Data States
  const [transactions, setTransactions] = useState([]);
  const [totalFee, setTotalFee] = useState(0); 
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form States
  const [newPayment, setNewPayment] = useState({ amount: '', method: 'UPI', reference: '' });
  const [tempFee, setTempFee] = useState('');

  const fetchFinanceData = async () => {
    if (!user) return;
    try {
      // 1. Fetch user's custom Total Fee
      const { data: settingsData } = await supabase
        .from('financial_settings')
        .select('total_fee')
        .eq('student_id', user.id);
        
      if (settingsData && settingsData.length > 0) {
        setTotalFee(settingsData[0].total_fee);
      }

      // 2. Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('student_id', user.id)
        .order('transaction_date', { ascending: false });
        
      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (err) {
      console.error("Error fetching finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [user]);

  // ── SAVE NEW TOTAL FEE ──
  const handleUpdateTotalFee = async (e) => {
    e.preventDefault();
    if (!tempFee || isNaN(tempFee) || Number(tempFee) < 0) return toast.error("Enter a valid fee amount.");
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('financial_settings')
        .upsert({ 
          student_id: user.id, 
          total_fee: parseFloat(tempFee),
          updated_at: new Date()
        });

      if (error) throw error;
      toast.success("Total fee updated!");
      setTotalFee(parseFloat(tempFee));
      setIsFeeModalOpen(false);
    } catch (err) {
      toast.error("Failed to update fee");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── RECORD PAYMENT ──
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount || isNaN(newPayment.amount) || Number(newPayment.amount) <= 0) {
      return toast.error("Please enter a valid amount.");
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .insert({
          student_id: user.id,
          amount: parseFloat(newPayment.amount),
          payment_method: newPayment.method,
          reference_id: newPayment.reference || `REF-${Math.floor(Math.random() * 1000000)}`,
          status: 'Completed'
        });

      if (error) throw error;
      toast.success("Payment recorded successfully!");
      setNewPayment({ amount: '', method: 'UPI', reference: '' });
      setIsModalOpen(false);
      fetchFinanceData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success("Transaction removed.");
      fetchFinanceData();
    } catch (err) {
      toast.error("Failed to delete transaction.");
    }
  };

  // Math Calculations based on real dynamic fee
  const totalPaid = useMemo(() => transactions.reduce((acc, curr) => acc + Number(curr.amount), 0), [transactions]);
  const balanceDue = Math.max(0, totalFee - totalPaid);
  const percentPaid = totalFee > 0 ? Math.min(100, (totalPaid / totalFee) * 100) : 0;

  const animContainer = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900 pb-20">
      
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Finance Center</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Semester fee tracking and transaction ledger.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-colors max-w-max"
        >
          <Plus size={16} /> Record Payment
        </button>
      </motion.div>

      <motion.div variants={animContainer} initial="hidden" animate="visible" className="space-y-8 max-w-5xl">
        
        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dynamic Total Fee Card */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Wallet size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Total Semester Fee</span>
              </div>
              <button 
                onClick={() => { setTempFee(totalFee || ''); setIsFeeModalOpen(true); }}
                className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 rounded-xl transition-all"
                title="Edit Total Fee"
              >
                <Edit3 size={16} strokeWidth={2.5} />
              </button>
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">
              {totalFee > 0 ? `₹${totalFee.toLocaleString()}` : <span className="text-slate-300 text-2xl">Not Set</span>}
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-2">Target Curriculum Cost</p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-500 mb-4">
              <TrendingUp size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Total Paid</span>
            </div>
            <h3 className="text-3xl font-black text-emerald-600 tracking-tight">₹{totalPaid.toLocaleString()}</h3>
            <p className="text-xs font-bold text-slate-400 mt-2">Verified Cleared Funds</p>
          </div>

          <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col justify-between ${balanceDue > 0 || totalFee === 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
            <div className={`flex items-center gap-2 mb-4 ${balanceDue > 0 || totalFee === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              <Clock size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Balance Due</span>
            </div>
            <h3 className={`text-3xl font-black tracking-tight ${balanceDue > 0 || totalFee === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ₹{balanceDue.toLocaleString()}
            </h3>
            <p className={`text-xs font-bold mt-2 ${balanceDue > 0 || totalFee === 0 ? 'text-amber-600/70' : 'text-emerald-600/70'}`}>
              {totalFee === 0 ? 'Awaiting Target Fee' : balanceDue > 0 ? 'Pending Clearance' : 'Fully Cleared! 🎉'}
            </p>
          </div>
        </div>

        {/* ── PROGRESS BAR ── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Payment Progress</h4>
              <p className="text-xs text-slate-400 font-medium mt-1">Tracking toward total semester clearance.</p>
            </div>
            <span className="text-2xl font-black text-indigo-600">{percentPaid.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
            {totalFee === 0 && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Set total fee to see progress</div>}
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${percentPaid}%` }} 
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${percentPaid >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
            />
          </div>
        </div>

        {/* ── TRANSACTION LEDGER ── */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black tracking-tight mb-6">Transaction Ledger</h3>
          
          {loading ? (
            <div className="animate-pulse text-slate-400 text-sm font-bold">Loading records...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
              <Receipt className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-500 font-bold">No transactions found.</p>
              <p className="text-xs text-slate-400 mt-1">Record a payment to start tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                    <th className="pb-4 pl-2">Date</th>
                    <th className="pb-4">Reference ID</th>
                    <th className="pb-4">Method</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Amount</th>
                    <th className="pb-4"></th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pl-2 font-medium text-slate-500 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-400">{tx.reference_id || 'N/A'}</td>
                      <td className="py-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider border border-slate-200">
                          {tx.payment_method || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-emerald-600">
                          <CheckCircle2 size={12} /> {tx.status || 'Verified'}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black text-slate-900 tracking-tight">
                        ₹{Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <button 
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── RECORD PAYMENT MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <Plus size={20} className="rotate-45" />
              </button>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900">Record Payment</h3>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Amount (₹)</label>
                  <input type="number" min="1" step="0.01" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                
                <div className="relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Payment Method</label>
                  <div onClick={() => setIsMethodOpen(!isMethodOpen)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-colors">
                    {newPayment.method}
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isMethodOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {isMethodOpen && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[105%] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {['UPI', 'Bank Transfer', 'Credit/Debit Card'].map(m => (
                          <div key={m} onClick={() => { setNewPayment({...newPayment, method: m}); setIsMethodOpen(false); }} className="p-3.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors">{m}</div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Reference ID (Optional)</label>
                  <input type="text" value={newPayment.reference} onChange={e => setNewPayment({...newPayment, reference: e.target.value})} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 text-sm mt-4 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Recording...' : <><CheckCircle2 size={18} /> Save Transaction</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT FEE MODAL ── */}
      <AnimatePresence>
        {isFeeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setIsFeeModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><Plus size={20} className="rotate-45" /></button>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900">Set Total Fee</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Enter your actual target curriculum cost.</p>
              </div>

              <form onSubmit={handleUpdateTotalFee} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Total Fee Amount (₹)</label>
                  <input type="number" min="0" step="1" placeholder="e.g. 50000" value={tempFee} onChange={e => setTempFee(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-100 text-sm">
                  {isSubmitting ? 'Saving...' : 'Update Total Fee'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}