import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, Send, Terminal, Sparkles, 
  ShieldCheck, User, Layers 
} from 'lucide-react';

export default function Cortex() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: 'Hello Likitha! I am Cortex, your Academic Decision Assistant. My neural checkpoints are optimized locally, and I am ready to assist you.', 
      pipeline: 'System Baseline Initialized' 
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('advisor');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/cortex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery, persona: selectedPersona })
      });

      const data = await response.json();
      
      if (data.status === 'success' || data.status === 'partial_success') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.response,
          pipeline: data.pipeline || 'Ollama Local Engine'
        }]);
      } else {
        throw new Error(data.message || 'Pipeline failed');
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `⚠️ Connection Error: ${err.message}. Ensure your Flask server and Ollama instance are running.`,
        pipeline: 'System Error'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900 flex justify-center">
      
      {/* ── CENTRALIZED CHAT INTERFACE ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl flex flex-col bg-white border border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden h-[calc(100vh-80px)]">
        
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">Cortex Terminal</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Local Qwen Engine Attached</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            {['advisor', 'tutor'].map(p => (
              <button 
                key={p} onClick={() => setSelectedPersona(p)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPersona === p ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p} Mode
              </button>
            ))}
          </div>
        </div>

        {/* Chat Message Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-slate-50/30">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-600 text-white shadow-indigo-200'}`}>
                {msg.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
              </div>
              <div className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block p-5 rounded-[2rem] text-sm font-medium leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white shadow-md rounded-tr-md' : 'bg-white border border-slate-200 text-slate-700 shadow-sm rounded-tl-md'}`}>
                  {msg.text}
                </div>
                {msg.pipeline && (
                  <div className={`flex items-center gap-1 mt-2 text-[9px] font-black uppercase tracking-wider ${msg.role === 'user' ? 'justify-end text-slate-400' : 'text-indigo-400'}`}>
                    <Terminal size={10} /> {msg.pipeline}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                <BrainCircuit size={18} className="animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-[2rem] rounded-tl-md flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query Cortex AI..." 
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-2xl py-4 pl-6 pr-16 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all placeholder-slate-400 shadow-inner"
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="absolute right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="text-center mt-4 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14}/> Zero Telemetry</span>
            <span className="flex items-center gap-1.5"><Layers size={14}/> 100% Local Processing</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}