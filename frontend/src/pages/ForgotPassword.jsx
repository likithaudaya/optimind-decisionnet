import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { BrainCircuit, Mail, ArrowLeft, KeyRound, Lock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  
  // Multi-step State: 1 = Email, 2 = OTP, 3 = New Password
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form Data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // ── STEP 1: SEND OTP EMAIL ──
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address.');

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      toast.success('Verification code sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 2: VERIFY THE 8-DIGIT CODE ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('Please enter the verification code.');

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery'
      });
      
      if (error) throw error;
      
      toast.success('Code verified! Set your new password.');
      setStep(3);
    } catch (err) {
      toast.error(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── STEP 3: SAVE NEW PASSWORD ──
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters.');

    setIsLoading(true);
    try {
      // 1. Save the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      // 2. Destroy the temporary recovery session so they MUST log in again
      await supabase.auth.signOut();
      
      toast.success('Password successfully reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Inter']">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
        
        {/* Background Decorative Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BrainCircuit className="text-white" size={32} />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-slate-900 tracking-tight mb-2">
            {step === 1 && "Reset Password"}
            {step === 2 && "Enter Code"}
            {step === 3 && "Secure Account"}
          </h2>
          <p className="text-sm text-center text-slate-500 font-medium mb-8">
            {step === 1 && "Enter your email to receive an 8-digit verification code."}
            {step === 2 && `We sent an 8-digit code to ${email}`}
            {step === 3 && "Your identity is verified. Create a new secure password."}
          </p>

          {/* ── UI FOR STEP 1: EMAIL ── */}
          {step === 1 && (
            <form onSubmit={handleSendEmail} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail size={18} className="text-slate-400" /></div>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                    placeholder="student@example.com"
                  />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex justify-center">
                {isLoading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          )}

          {/* ── UI FOR STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">8-Digit Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><KeyRound size={18} className="text-slate-400" /></div>
                  <input
                    type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                    maxLength={8}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.2em] font-black outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                    placeholder="00000000"
                  />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex justify-center">
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}

          {/* ── UI FOR STEP 3: NEW PASSWORD ── */}
          {step === 3 && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div>
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2">
                {isLoading ? 'Saving...' : <><CheckCircle2 size={18} /> Update Password</>}
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <Link to="/login" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}