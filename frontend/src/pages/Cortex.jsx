import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, Send, Terminal, Database, 
  Sparkles, ShieldCheck, User, RefreshCw, Layers 
} from 'lucide-react';

export default function Cortex() {
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: 'Hello Likitha! I am Cortex, your Academic Decision Assistant. My neural checkpoints are optimized locally, and I have indexed your semester records.', 
      pipeline: 'System Baseline Initialized' 
    }
  ]);
  const [input, setInput] = useState('');
  const [activePane, setActivePane] = useState('chat');
  const [selectedPersona, setSelectedPersona] = useState('advisor');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Dynamic system token arrays to simulate your local database memory map
  const vectorMemoryIndex = [
    { token: 'Condonation Bounds (DBMS)', weight: '0.948', cluster: 'Attendance' },
    { token: 'B+ Tree Page Split Execution', weight: '0.881', cluster: 'DBMS marks' },
    { token: 'Graph Cycles DFS Pipeline', weight: '0.814', cluster: 'DSA assignments' }
  ];

  // Keep chat viewport scrolled to bottom automatically
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleQuerySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input;
    setInput('');
    
    // 1. Commit user message to stream state
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userText, 
      pipeline: 'Token Generation Event: Input Captured' 
    }]);

    setIsTyping(true);

    try {
      // 2. Dispatch payload straight to your running Python Flask API
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/cortex/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText,
          persona: selectedPersona 
        })
      });

      const data = await response.json();
      
      // 3. Append LLM response array
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.response || 'Inference engine fallback checkpoint hit.',
        pipeline: data.pipeline || 'Ollama Stream: qwen2.5:3b'
      }]);

    } catch (err) {
      console.warn("Flask AI bridge down. Utilizing local offline simulation layer.", err);
      // Beautiful offline fallback simulation so your UI never breaks
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `[Offline Simulation Mode] Cortex received your query regarding "${userText}". Once we launch our Flask connection, this message will process through your local Qwen model.`,
          pipeline: 'Local UI Simulation Pipeline'
        }]);
      }, 700);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] p-6 lg:p-10 font-['Inter'] text-slate-900 flex flex-col">
      
      {/* Header Context */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            Cortex AI Portal <Sparkles className="text-indigo-600 animate-pulse" size={24} />
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Local LLM Orchestration Framework & Vector Semantic Mapping Workspace.</p>
        </div>

        {/* Workspace Mode Selectors */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
          <button 
            onClick={() => setActivePane('chat')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activePane === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Terminal Workspace
          </button>
          <button 
            onClick={() => setActivePane('pipeline')}
            className={`px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider rounded-xl ${activePane === 'pipeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Vector Memory Index
          </button>
        </div>
      </div>

      {/* Main Grid Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-stretch">
        
        {/* Left Configurations Pane Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Persona Controller Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Layers size={14} className="text-indigo-600" /> Agent Persona Cluster
            </h3>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'advisor', name: 'Academic Advisor', desc: 'Balances risk limits & schedules', icon: '🎓' },
                { id: 'tutor', name: 'Socratic Teacher', desc: 'Breaks down raw computing code logic', icon: '🔬' },
                { id: 'critic', name: 'Strict Examiner', desc: 'Compiles evaluation test drills', icon: '⏱️' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex gap-3 items-center ${
                    selectedPersona === p.id ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <span className={`text-sm font-bold block ${selectedPersona === p.id ? 'text-indigo-600' : 'text-slate-800'}`}>{p.name}</span>
                    <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">{p.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Secure Private Operational Context Information Capsule */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex-1 hidden lg:flex flex-col justify-between">
            <div className="space-y-4 relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <ShieldCheck size={20} className="text-indigo-400" />
              </div>
              <h4 className="text-lg font-black tracking-tight">Privacy Architecture</h4>
              <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                Your conversations are contained entirely on your local machine using hardware-accelerated processing layers. Zero raw parameter matrices cross external third-party servers.
              </p>
            </div>
            <div className="text-[10px] font-mono text-indigo-300/50 mt-8 relative z-10 border-t border-white/5 pt-4">
              ACTIVE SUITE Core: 127.0.0.1:11434
            </div>
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-indigo-600 rounded-full blur-[80px] opacity-30" />
          </div>
        </div>

        {/* Right Active Processing View Workspace */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[550px]">
          
          {activePane === 'chat' ? (
            <>
              {/* Chat Conversation Feeds Screen */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 max-h-[460px] bg-slate-50/40">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}
                  >
                    <div className={`flex items-center gap-2 text-[10px] font-bold text-slate-400 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'user' ? <User size={12}/> : <BrainCircuit size={12} className="text-indigo-600"/>}
                      <span>{msg.role === 'user' ? 'Likitha U' : 'Cortex Assistant'}</span>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 6 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed font-medium shadow-sm border ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none shadow-indigo-100/50' 
                          : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </motion.div>
                    
                    <span className="text-[9px] font-mono text-slate-400 px-2 uppercase tracking-tight">
                      {msg.pipeline}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex flex-col items-start gap-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 px-1">
                      <BrainCircuit size={12} className="text-indigo-600 animate-spin"/>
                      <span>Cortex Core Thinking...</span>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex gap-1.5 items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Action Form Tray */}
              <form onSubmit={handleQuerySubmit} className="p-4 border-t border-slate-100 flex gap-3 items-center bg-white">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Query the localized ${selectedPersona} cluster path...`}
                  className="flex-1 p-4 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={isTyping}
                  className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            /* Vector Database Pipeline Telemetry Screen Sub-View */
            <div className="p-8 space-y-6 flex-1 bg-white">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2"><Database className="text-indigo-600" size={18}/> Local FAISS Semantic Proximity Maps</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Real-time trace logs monitoring semantic token retrieval metrics from your database tables.</p>
              </div>

              <div className="space-y-3">
                {vectorMemoryIndex.map((node, index) => (
                  <div key={index} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center hover:bg-slate-100/50 transition-colors">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-800 block">{node.token}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded max-w-max block">{node.cluster}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-black text-indigo-600 block">L2 Cosine Score</span>
                      <span className="text-sm font-bold text-slate-500">{node.weight}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl text-xs text-slate-600 flex gap-3 items-start">
                <Terminal size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  <b>FAISS Embeddings Engine Status:</b> Vector spaces are mapped using locally loaded sentence-transformers. Pipeline is fully synchronized to catch updates inside your Supabase curriculum records automatically.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}