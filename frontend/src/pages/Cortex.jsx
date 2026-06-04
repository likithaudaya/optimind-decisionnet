import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, Send, Terminal, Sparkles, 
  ShieldCheck, User, Layers 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Cortex() {
  const { user } = useAuthStore();
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userQuery,
          student_id: user?.id || '',
          persona: selectedPersona
        })
      });

      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.response,
          pipeline: data.pipeline_trace || 'Local Pipeline Processing'
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: 'The local model processing sequence returned a vacant token array.',
          pipeline: 'Error Vector'
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Handshake with local microservice rejected. Verify that python app.py is active.',
        pipeline: 'Network Interruption'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-7rem)] flex flex-col font-['Inter'] bg-[#f8fafc] p-2">
      
      {/* Control Configuration Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-xl text-indigo-400 shadow-inner">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              Cortex Context Node
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interconnected Database Ingestion Engine Active</p>
          </div>
        </div>

        {/* Persona Controller Selection Matrix */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shadow-inner">
          {[
            { id: 'advisor', label: 'Growth Advisor', icon: User },
            { id: 'strategist', label: 'Data Strategist', icon: Layers },
            { id: 'terminal', label: 'Core Kernel', icon: BrainCircuit }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer ${selectedPersona === p.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <p.icon size={12} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream Viewport */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm p-6 overflow-y-auto space-y-6 min-h-[300px]">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-3`}>
            {m.role !== 'user' && (
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex-shrink-0">
                <BrainCircuit size={16} />
              </div>
            )}
            <div className={`max-w-[80%] space-y-1`}>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed font-medium ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-800 border border-slate-200/50'}`}>
                {m.text}
              </div>
              {m.pipeline && (
                <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase block pl-1">
                  ⚡ {m.pipeline}
                </span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 animate-pulse">
              <BrainCircuit size={16} />
            </div>
            <div className="bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-2xl flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-[2rem] mt-4 shadow-sm">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Cortex for advice on your current semester trajectory..." 
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-2xl py-4 pl-6 pr-16 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all placeholder-slate-400 shadow-inner"
            disabled={isTyping}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="text-center mt-4 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500" /> End-to-End Local Ingestion</span>
          <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-indigo-500" /> Qwen 2.5 LLM Mounted</span>
        </div>
      </div>

    </div>
  );
}