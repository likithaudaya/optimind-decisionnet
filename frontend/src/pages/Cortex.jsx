import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, Send, Terminal, Sparkles,
  ShieldCheck, User, Layers, Zap, Trash2,
  History, MemoryStick
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

const FLASK_URL = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  "Summarize my highest risks.",
  "Give me a 3-step study strategy.",
  "Which subject needs the most attention?",
  "How is my attendance looking?",
];

// ─── TEXT FORMATTER ───────────────────────────────────────────────────────────
function formatMessageText(text) {
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={idx} className="ml-4 mb-2 list-disc marker:text-indigo-400 pl-1 text-sm">
          {trimmed.substring(2)}
        </li>
      );
    }
    return <p key={idx} className="mb-2 last:mb-0 text-sm leading-relaxed">{line}</p>;
  });
}

// ─── MEMORY BADGE ─────────────────────────────────────────────────────────────
function MemoryBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-200"
    >
      <MemoryStick size={9} /> {count} {count === 1 ? 'exchange' : 'exchanges'} remembered
    </motion.span>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Cortex() {
  const { user } = useAuthStore();

  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [selectedPersona, setSelectedPersona] = useState('advisor');
  const [isTyping, setIsTyping]               = useState(false);

  // Memory state
  const [memoryCount, setMemoryCount]           = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel]   = useState(false);
  const [memoryHistory, setMemoryHistory]       = useState([]);

  const chatEndRef = useRef(null);
  
  // 🚨 THE FIX: Ref lock ensures chat NEVER re-wipes after it mounts once
  const hasInitialized = useRef(false);

  // ── Auto-scroll ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Fetch full history for the side panel (via Flask backend to bypass RLS) ──
  const fetchMemoryHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${FLASK_URL}/api/cortex/history?student_id=${user.id}`);
      const data = await res.json();
      if (data.history) {
        setMemoryHistory(data.history);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id]);

  // ── On mount: load memory count, fetch history, then set UI messages ──
  useEffect(() => {
    if (hasInitialized.current) return; // Prevent double execution wiping the state
    if (!user?.id) {
        setIsLoadingHistory(false);
        return;
    }

    async function initChat() {
      setIsLoadingHistory(true);
      try {
        // Fetch Memory Count
        const statsRes = await fetch(`${FLASK_URL}/api/cortex/memory-stats?student_id=${user.id}`);
        const statsData = await statsRes.json();
        const totalExchanges = statsData.exchanges || 0;
        setMemoryCount(totalExchanges);

        // Fetch Full History
        const histRes = await fetch(`${FLASK_URL}/api/cortex/history?student_id=${user.id}`);
        const histData = await histRes.json();
        
        let loadedMessages = [];
        if (histData.history && histData.history.length > 0) {
          setMemoryHistory(histData.history);
          
          // Reverse array so chronological order reads top-to-bottom
          const chronological = [...histData.history].reverse();
          chronological.forEach(row => {
            if (row.context_text) loadedMessages.push({ role: 'user', text: row.context_text });
            if (row.recovery_plan) loadedMessages.push({ role: 'assistant', text: row.recovery_plan, pipeline: 'Memory Restored' });
          });
        }

        const greetingText = totalExchanges > 0
          ? `Welcome back! I remember our last ${totalExchanges} exchange${totalExchanges > 1 ? 's' : ''}. What would you like to work on?`
          : `Hello! I'm Cortex — your AI academic advisor. I'll remember our conversations across sessions. What's on your mind?`;

        setMessages([
          { role: 'assistant', text: greetingText, pipeline: totalExchanges > 0 ? 'Memory Active' : 'New Session' },
          ...loadedMessages
        ]);

      } catch (err) {
        console.error("Failed to load Cortex history", err);
      } finally {
        hasInitialized.current = true; // Lock state
        setIsLoadingHistory(false);
      }
    }
    
    initChat();
  }, [user?.id]);

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const userQuery = overrideText || input;
    if (!userQuery.trim() || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsTyping(true);

    // Brevity injection — stripped before saving to DB in the backend
    const optimizedQuery = `${userQuery}\n\n(CRITICAL INSTRUCTION: Be extremely brief and direct. Maximum 2-3 short sentences or bullet points. No long paragraphs.)`;

    // AbortController gives us a hard client-side timeout (90s)
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch(`${FLASK_URL}/api/cortex`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body:    JSON.stringify({
          message:    optimizedQuery,
          student_id: user?.id || '',
          persona:    selectedPersona,
        }),
      });

      clearTimeout(timeoutId);

      let data = {};
      try { data = await res.json(); } catch { data = { error: `Server returned ${res.status}` }; }

      if (!res.ok || data.error) {
        const errMsg = data.error || `Server error ${res.status}`;
        setMessages(prev => [...prev, {
          role:     'assistant',
          text:     `⚠️ ${errMsg}`,
          pipeline: `Error ${res.status}`,
        }]);
        return;
      }

      if (data.response) {
        setMessages(prev => [...prev, {
          role:     'assistant',
          text:     data.response,
          pipeline: data.memory_saved
            ? `Memory saved · ${(data.history_turns || 0) + 1} exchange${(data.history_turns || 0) + 1 === 1 ? '' : 's'} total`
            : 'Local Context Active (DB Sync Failed)',
        }]);

        if (data.memory_saved) {
          setMemoryCount((data.history_turns || 0) + 1);
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      setMessages(prev => [...prev, {
        role:     'assistant',
        text:     isTimeout
          ? 'Request timed out after 90 seconds. Ollama may be overloaded — try again.'
          : 'Cannot reach the backend. Make sure python app.py is running on port 5000.',
        pipeline: isTimeout ? 'Timeout' : 'Network Error',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── CLEAR MEMORY ──────────────────────────────────────────────────────────
  const handleClearMemory = async () => {
    if (!window.confirm("This will permanently erase all of Cortex's memory of your past conversations. Continue?")) return;
    setIsClearingMemory(true);
    try {
      const res  = await fetch(`${FLASK_URL}/api/cortex/clear-memory`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ student_id: user?.id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMemoryCount(0);
        setMemoryHistory([]);
        toast.success('Cortex memory cleared.');
        setMessages([{
          role:     'assistant',
          text:     'Memory wiped. Starting fresh — what would you like to work on?',
          pipeline: 'Memory Cleared',
        }]);
      } else {
        toast.error('Failed to clear memory.');
      }
    } catch {
      toast.error('Network error while clearing memory.');
    } finally {
      setIsClearingMemory(false);
    }
  };

  // ── OPEN MEMORY PANEL ────────────────────────────────────────────────────
  const handleOpenMemoryPanel = async () => {
    await fetchMemoryHistory();
    setShowMemoryPanel(true);
  };

  // ── LOADING STATE ────────────────────────────────────────────────────────
  if (isLoadingHistory && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
          <BrainCircuit size={18} className="animate-pulse text-indigo-500" />
          Loading Cortex memory...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-7rem)] flex flex-col font-['Inter'] bg-[#f8fafc] p-2">

      {/* ── CONTROL BAR ── */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">

        {/* Left: title + memory badge */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-xl text-indigo-400 shadow-inner">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Cortex Context Node
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <Zap size={10} className="text-amber-500" /> Fast-Track Mode Active
              </p>
              <MemoryBadge count={memoryCount} />
            </div>
          </div>
        </div>

        {/* Right: memory controls + persona selector */}
        <div className="flex items-center gap-3 flex-wrap justify-end">

          {/* Memory Log + Clear buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenMemoryPanel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer"
            >
              <History size={12} /> Memory Log
            </button>

            {memoryCount > 0 && (
              <button
                onClick={handleClearMemory}
                disabled={isClearingMemory}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={12} /> {isClearingMemory ? 'Clearing...' : 'Clear'}
              </button>
            )}
          </div>

          {/* Persona selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shadow-inner">
            {[
              { id: 'advisor',    label: 'Growth Advisor',  icon: User },
              { id: 'strategist', label: 'Data Strategist', icon: Layers },
              { id: 'terminal',   label: 'Core Kernel',     icon: BrainCircuit },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPersona(p.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${
                  selectedPersona === p.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <p.icon size={12} /> {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CHAT VIEWPORT ── */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm p-6 overflow-y-auto space-y-6 min-h-[300px] custom-scrollbar">
        {messages.map((m, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}
          >
            {m.role !== 'user' && (
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex-shrink-0 mt-1">
                <BrainCircuit size={16} />
              </div>
            )}

            <div className="max-w-[85%] space-y-1.5">
              <div className={`p-5 rounded-[1.5rem] leading-relaxed font-medium ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 rounded-tr-sm'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/60 rounded-tl-sm'
              }`}>
                {m.role === 'assistant' ? formatMessageText(m.text) : m.text}
              </div>

              {m.pipeline && (
                <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block pl-2">
                  ⚡ {m.pipeline}
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 animate-pulse">
              <BrainCircuit size={16} />
            </div>
            <div className="bg-slate-50 border border-slate-200/50 px-5 py-4 rounded-[1.5rem] rounded-tl-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} className="pb-2" />
      </div>

      {/* ── INPUT AREA ── */}
      <div className="mt-4 space-y-3">

        {/* Quick action chips */}
        <div className="flex flex-wrap gap-2 px-1">
          <AnimatePresence>
            {!isTyping && QUICK_ACTIONS.map((action, i) => (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={i}
                onClick={(e) => handleSendMessage(e, action)}
                className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {action}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Input form */}
        <div className="p-2 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Cortex for rapid advice..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-2xl py-4 pl-6 pr-16 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder-slate-400"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>

          <div className="text-center mt-3 pb-1 flex items-center justify-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500" /> Embedded Privacy
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" /> Accelerated Stateful RAG
            </span>
            {memoryCount > 0 && (
              <span className="flex items-center gap-1.5">
                <MemoryStick size={12} className="text-violet-500" /> {memoryCount} exchanges in memory
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── MEMORY HISTORY SIDE PANEL ── */}
      <AnimatePresence>
        {showMemoryPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemoryPanel(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />

            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
            >
              {/* Panel header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <History size={16} className="text-indigo-600" /> Cortex Memory Log
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {memoryHistory.length} exchanges stored
                  </p>
                </div>
                <button
                  onClick={() => setShowMemoryPanel(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {memoryHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <MemoryStick size={40} className="mb-3" />
                    <p className="text-sm font-bold">No memory yet</p>
                    <p className="text-xs mt-1 text-center">
                      Start chatting — Cortex will remember your conversations.
                    </p>
                  </div>
                ) : (
                  memoryHistory.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3"
                    >
                      {/* User turn */}
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User size={10} className="text-white" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 leading-relaxed">
                          {entry.context_text}
                        </p>
                      </div>

                      {/* Assistant turn */}
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BrainCircuit size={10} className="text-slate-600" />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                          {entry.recovery_plan}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <p className="text-[9px] text-slate-300 font-medium pl-7">
                        {new Date(entry.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Panel footer */}
              {memoryHistory.length > 0 && (
                <div className="p-4 border-t border-slate-100">
                  <button
                    onClick={() => { handleClearMemory(); setShowMemoryPanel(false); }}
                    disabled={isClearingMemory}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={12} /> {isClearingMemory ? 'Clearing...' : 'Wipe All Memory'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}