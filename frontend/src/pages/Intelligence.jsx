import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import { 
  BrainCircuit, Calculator, AlertCircle, CheckCircle2, 
  Activity, Database, UploadCloud, FileText, Send, 
  Sparkles, HelpCircle, Target, Clock, AlertTriangle, MessageSquare, GraduationCap, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const riskConfig = {
  Low:    { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: '✓ Low Risk' },
  Medium: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: '⚡ Medium Risk' },
  High:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: '⚠ High Risk' },
};

const gradePoints = { 'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0 };

function predictGradeLocal(marks, attendance, assignments) {
  const score = (marks * 0.5) + (attendance * 0.3) + (assignments * 0.2);
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function calcGPA(subjectList) {
  if (!subjectList || subjectList.length === 0) return "0.00";
  const total = subjectList.reduce((sum, s) => sum + (gradePoints[predictGradeLocal(s.marks, s.attendance, s.assignments)] || 0), 0);
  return (total / subjectList.length).toFixed(2);
}

export default function Intelligence() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('vault'); 
  const [expanded, setExpanded] = useState(null);
  
  // LIVE DATABASE STATES
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [planTasks, setPlanTasks] = useState([]);

  // SIMULATOR STATES
  const [simMarks, setSimMarks] = useState(0);
  const [simAttendance, setSimAttendance] = useState(0);
  const [simAssignments, setSimAssignments] = useState(0);

  // MACHINE LEARNING STATES
  const [mlPredictedRisk, setMlPredictedRisk] = useState('Evaluating...');
  const [mlConfidence, setMlConfidence] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);

  // === ACADEMIC VAULT STATES ===
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [vaultStats, setVaultStats] = useState({ indexed: 0, filename: '' });
  
  // CHAT MODE STATES
  const [sandboxMode, setSandboxMode] = useState('chat');
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  // QUIZ MODE STATES
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isQuerying]);

  useEffect(() => {
    async function fetchSubjects() {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('academic_records').select('*').eq('student_id', user.id).order('created_at', { ascending: true });
        if (error) throw error;
        setSubjects(data || []);
        if (data && data.length > 0) setSelectedSubject(data[0]);
      } catch (err) {
        console.error("Failed to load records:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubjects();
  }, [user]);

  useEffect(() => {
    async function fetchMatrixTasks() {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('study_tasks').select('*').eq('student_id', user.id).eq('done', false);
        if (error) throw error;
        if (data) {
          const formattedTasks = data.map((task) => {
            const subjectCode = task.subject.split('-')[0].trim() || 'Task';
            let minutes = 45;
            const dur = task.duration?.toLowerCase() || '';
            if (dur.includes('min')) {
              const match = dur.match(/(\d+)/);
              if (match) minutes = parseInt(match[1], 10);
            } else if (dur.includes('hour')) {
              const match = dur.match(/([\d.]+)/);
              if (match) minutes = parseFloat(match[1]) * 60;
            }
            return { ...task, minutes, subjectCode };
          });
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          formattedTasks.sort((a, b) => {
            const pA = priorityWeight[a.priority?.toLowerCase()] || 0;
            const pB = priorityWeight[b.priority?.toLowerCase()] || 0;
            if (pA !== pB) return pB - pA; 
            return b.minutes - a.minutes; 
          });
          setPlanTasks(formattedTasks);
        }
      } catch (err) {
        console.error("Chart compilation error:", err);
      }
    }
    fetchMatrixTasks();
  }, [user]);

  useEffect(() => {
    if (selectedSubject) {
      setSimMarks(selectedSubject.marks);
      setSimAttendance(selectedSubject.attendance);
      setSimAssignments(selectedSubject.assignments);
    }
  }, [selectedSubject]);

  const fetchLiveMLPrediction = async (marks, attendance, assignments) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000'}/api/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_marks: marks, attendance: attendance, assignment_score: assignments })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMlPredictedRisk(data.prediction);
        setMlConfidence(data.confidence_metrics);
        setIsApiConnected(true);
      }
    } catch (err) {
      setIsApiConnected(false);
      const score = (marks * 0.5) + (attendance * 0.3) + (assignments * 0.2);
      setMlPredictedRisk(score < 55 || attendance < 65 ? 'High' : (score < 72 || attendance < 75 ? 'Medium' : 'Low'));
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      const delay = setTimeout(() => { fetchLiveMLPrediction(simMarks, simAttendance, simAssignments); }, 300); 
      return () => clearTimeout(delay);
    }
  }, [simMarks, simAttendance, simAssignments, selectedSubject]);

  
  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    e.target.value = null; 

    if (!uploadedFile) return;

    if (uploadedFile.type !== 'application/pdf' && !uploadedFile.name.toLowerCase().endsWith('.pdf')) {
      return toast.error('Please upload a valid PDF document.');
    }

    if (!user || !user.id) {
      return toast.error('Authentication error. Please log in again.');
    }

    setFile(uploadedFile);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('student_id', user.id); 

    try {
      const baseUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/vault/upload`, { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');
      toast.success(`${uploadedFile.name} securely indexed into Cloud Memory!`);
      setVaultStats({ indexed: data.total_indexed_chunks, filename: uploadedFile.name });
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error(err.message);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query;
    setChatHistory(prev => [...prev, { role: 'user', content: currentQuery }]);
    setQuery('');
    setIsQuerying(true);

    try {
      const baseUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/vault/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, student_id: user.id }), 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Query failed');

      setChatHistory(prev => [...prev, { role: 'cortex', content: data.answer, context: data.context_used }]);
    } catch (err) {
      toast.error(err.message);
      setChatHistory(prev => [...prev, { role: 'error', content: `Error communicating with local AI: ${err.message}` }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const generateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizData(null);
    setQuizScore(0);
    setCurrentQIndex(0);
    setIsAnswerRevealed(false);
    setSelectedOption(null);
    const toastId = toast.loading("Cortex is analyzing the text and compiling a quiz...");

    try {
      const baseUrl = import.meta.env.VITE_FLASK_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/vault/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.id }) 
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Quiz generation failed');
      
      setQuizData(data);
      toast.success("Quiz compiled successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleAnswerSelect = (option) => {
    if (isAnswerRevealed) return;
    setSelectedOption(option);
    setIsAnswerRevealed(true);
    
    // Safety check in case the AI generated weird keys
    const correctAnswer = quizData?.[currentQIndex]?.correct_answer;
    if (option === correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setIsAnswerRevealed(false);
    setSelectedOption(null);
    setCurrentQIndex(prev => prev + 1);
  };

  const currentGPA = useMemo(() => calcGPA(subjects), [subjects]);
  const simGrade = useMemo(() => predictGradeLocal(simMarks, simAttendance, simAssignments), [simMarks, simAttendance, simAssignments]);
  const simGPA = useMemo(() => {
    if (!selectedSubject) return "0.00";
    const updated = (subjects || []).map(s => s.id === selectedSubject.id ? { ...s, marks: simMarks, attendance: simAttendance, assignments: simAssignments } : s);
    return calcGPA(updated);
  }, [simMarks, simAttendance, simAssignments, selectedSubject, subjects]);
  const gpaDiff = (parseFloat(simGPA) - parseFloat(currentGPA)).toFixed(2);

  const animContainer = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } } };
  const animItem = { hidden: { opacity: 0, scale: 0.97 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } } };

  const getSubjectRisk = (m, a, as) => {
    const score = (m * 0.5) + (a * 0.3) + (as * 0.2);
    return (score < 55 || a < 65) ? 'High' : (score < 72 || a < 75 ? 'Medium' : 'Low');
  };

  if (loading) return <div className="p-10 text-slate-500 font-medium animate-pulse">Initializing Neural Matrices...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Intelligence Hub</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm font-medium">Predictive ML matrices & RAG memory systems.</p>
            {isApiConnected ? (
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">ML Engine Online</span>
            ) : (
               <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">Local Math Mode</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 max-w-max self-start md:self-auto gap-1">
          {[
            { id: 'vault', label: 'Memory Vault', icon: <Database size={14} className="mr-1.5 inline-block"/> },
            { id: 'overview', label: 'Risk Overview' }, 
            { id: 'simulator', label: 'What-If Simulator' }, 
            { id: 'forecast', label: 'Attendance Forecast' }, 
            { id: 'effort', label: 'Workload Analysis' } 
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-xs font-bold transition-all uppercase tracking-wider flex items-center ${activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {activeTab === tab.id && <motion.div layoutId="activeIntelligenceTab" className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-100" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className="relative z-10 flex items-center">{tab.icon}{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
      {subjects?.length === 0 && activeTab !== 'vault' ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Activity className="text-slate-300 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Awaiting Data Streams</h2>
          <p className="text-slate-500 text-sm max-w-md text-center">Your predictive models require baseline data. Please add your current semester subjects on the Dashboard first.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* ── TAB 0: THE NEW CLOUD ACADEMIC VAULT ── */}
          {activeTab === 'vault' && (
            <motion.div key="vault" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-950 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-indigo-400/20">Cloud Tech Layer</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight mb-2">Academic Memory Vault</h1>
                  <p className="text-indigo-200 text-sm max-w-xl font-medium">
                    Upload textbooks or syllabus PDFs. Your files are securely stored in Supabase Buckets, and vector embeddings are tracked via pgvector in the cloud.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Database size={16} className="text-indigo-600" /> Ingestion Control
                    </h3>
                    
                    <label className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer block transition-all group">
                      <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                      <UploadCloud size={36} className="mx-auto text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                      <span className="block text-xs font-bold text-slate-700 mb-1">
                        {isUploading ? 'Syncing to Supabase Cloud...' : 'Drop textbook PDF here'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">Max size 200MB · Searchable text only</span>
                    </label>

                    {file && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
                        <FileText className="text-indigo-600 flex-shrink-0" size={20} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                            {isUploading ? 'Cloud Database Synching' : 'Database Ready'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-500" /> Cloud Vector Engine
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-medium">Embedding Model</span>
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">all-MiniLM-L6-v2</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-medium">Database Layer</span>
                        <span className="font-bold text-indigo-600">Supabase pgvector</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Indexed Chunks</span>
                        <span className="font-black text-slate-800">{vaultStats.indexed} blocks</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col min-h-[550px] max-h-[700px] overflow-hidden">
                    
                    {/* SANDBOX MODE TOGGLE HEADER */}
                    <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-wrap items-center justify-between z-10 gap-4">
                      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                        <button 
                          onClick={() => setSandboxMode('chat')}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${sandboxMode === 'chat' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <MessageSquare size={14} /> AI Chat
                        </button>
                        <button 
                          onClick={() => setSandboxMode('quiz')}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${sandboxMode === 'quiz' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          <GraduationCap size={14} /> Practice Quiz
                        </button>
                      </div>
                      
                      {vaultStats.filename && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full truncate max-w-[200px]">
                          Connected: {vaultStats.filename}
                        </span>
                      )}
                    </div>

                    {/* DYNAMIC SANDBOX AREA */}
                    {sandboxMode === 'chat' ? (
                      <>
                        {/* CHAT UI */}
                        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30">
                          {(chatHistory || []).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                              <BrainCircuit size={40} className="text-slate-300 mb-3 animate-pulse" />
                              <p className="text-xs font-bold text-slate-500">Query Workspace Active</p>
                              <p className="text-[11px] text-slate-400 max-w-xs mt-1">Ingest an academic document on the left, then ask specific structural questions regarding your course load.</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
                              {(chatHistory || []).map((msg, idx) => (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx}
                                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                  {msg.role === 'user' ? (
                                    <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                                      <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                  ) : msg.role === 'cortex' ? (
                                    <div className="bg-white border border-indigo-100 p-5 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm space-y-3">
                                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Sparkles size={12} /> Cortex Grounded Synthesis
                                      </p>
                                      <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>

                                      {msg.context && (
                                        <div className="mt-3 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mathematical Source Context</p>
                                          <pre className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                            {msg.context}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs font-bold mx-auto">
                                      {msg.content}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                              
                              {isQuerying && (
                                <div className="flex justify-start">
                                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm flex items-center gap-3">
                                    <BrainCircuit size={16} className="text-indigo-400 animate-pulse" />
                                    <span className="text-xs font-bold text-slate-400">Cortex is querying the cloud vector database...</span>
                                  </div>
                                </div>
                              )}
                              <div ref={chatEndRef} />
                            </div>
                          )}
                        </div>

                        <form onSubmit={handleQuerySubmit} className="border-t border-slate-100 p-4 bg-white z-10">
                          <div className="relative flex items-center">
                            <input
                              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                              placeholder={
                                isQuerying ? "Cortex is querying the cloud vector database..." :
                                vaultStats.indexed > 0 ? "Ask anything about the ingested documents..." :
                                "Please ingest a document to begin questioning system memory..."
                              }
                              disabled={vaultStats.indexed === 0 || isQuerying}
                              className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                              type="submit" disabled={vaultStats.indexed === 0 || isQuerying || !query.trim()}
                              className="absolute right-2 p-2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {isQuerying ? (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Send size={16} />
                              )}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <>
                        {/* QUIZ UI */}
                        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 flex flex-col justify-center">
                          {!quizData && !isGeneratingQuiz && (
                             <div className="text-center space-y-4">
                                <GraduationCap size={48} className="mx-auto text-indigo-200" />
                                <div>
                                  <h3 className="text-lg font-black text-slate-900">Interactive Knowledge Check</h3>
                                  <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Cortex will pull from your pgvector cloud chunks and dynamically generate a multiple-choice exam.</p>
                                </div>
                                <button 
                                  onClick={generateQuiz} 
                                  disabled={vaultStats.indexed === 0}
                                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
                                >
                                  Generate Practice Quiz
                                </button>
                                {vaultStats.indexed === 0 && <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-2">Upload a PDF first</p>}
                             </div>
                          )}

                          {isGeneratingQuiz && (
                            <div className="text-center space-y-4">
                               <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                               <p className="text-sm font-bold text-slate-500">Synthesizing cloud materials...</p>
                            </div>
                          )}

                          {quizData && currentQIndex < (quizData?.length || 0) && (
                            <AnimatePresence mode="wait">
                              <motion.div 
                                key={currentQIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="max-w-2xl mx-auto w-full space-y-6"
                              >
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                                  <span>Question {currentQIndex + 1} of {quizData?.length || 0}</span>
                                  <span className="text-indigo-600">Score: {quizScore}</span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                                  {quizData[currentQIndex]?.question || "Missing Question from AI"}
                                </h3>

                                <div className="space-y-3">
                                  {/* 🛡️ OPTIONAL CHAINING ADDED HERE TO PREVENT CRASHES */}
                                  {(quizData[currentQIndex]?.options || []).map((opt, i) => {
                                    const isCorrect = opt === quizData[currentQIndex]?.correct_answer;
                                    const isSelected = opt === selectedOption;
                                    
                                    let btnClass = "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700";
                                    if (isAnswerRevealed) {
                                      if (isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
                                      else if (isSelected) btnClass = "border-rose-500 bg-rose-50 text-rose-700 font-bold";
                                      else btnClass = "border-slate-200 bg-slate-50 opacity-50";
                                    }

                                    return (
                                      <button
                                        key={i}
                                        onClick={() => handleAnswerSelect(opt)}
                                        disabled={isAnswerRevealed}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer disabled:cursor-default flex items-center justify-between ${btnClass}`}
                                      >
                                        <span>{opt}</span>
                                        {isAnswerRevealed && isCorrect && <CheckCircle2 size={18} className="text-emerald-500" />}
                                        {isAnswerRevealed && isSelected && !isCorrect && <XCircle size={18} className="text-rose-500" />}
                                      </button>
                                    );
                                  })}

                                  {/* Failsafe message if the AI forgets to provide options */}
                                  {(!quizData[currentQIndex]?.options || quizData[currentQIndex]?.options?.length === 0) && (
                                     <p className="text-rose-500 text-sm font-bold bg-rose-50 p-3 rounded-lg border border-rose-100">
                                       AI System skipped generating answer options for this chunk. Click Next Question.
                                     </p>
                                  )}
                                </div>

                                {isAnswerRevealed && (
                                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2 mt-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1"><BrainCircuit size={14}/> Cortex Explanation</p>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{quizData[currentQIndex]?.explanation || "No further context provided."}</p>
                                    
                                    <button 
                                      onClick={nextQuestion}
                                      className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors"
                                    >
                                      {currentQIndex === (quizData?.length || 1) - 1 ? 'View Final Results' : 'Next Question ➔'}
                                    </button>
                                  </motion.div>
                                )}
                              </motion.div>
                            </AnimatePresence>
                          )}

                          {quizData && currentQIndex >= (quizData?.length || 0) && (
                             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 max-w-md mx-auto">
                               <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
                                  <span className="text-3xl font-black text-white">{quizScore}/{quizData?.length || 0}</span>
                               </div>
                               <div>
                                 <h3 className="text-2xl font-black text-slate-900">Quiz Completed!</h3>
                                 <p className="text-sm text-slate-500 mt-2 font-medium">You scored {Math.round((quizScore / (quizData?.length || 1)) * 100)}% on this vault extraction.</p>
                               </div>
                               <button 
                                  onClick={generateQuiz} 
                                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                                >
                                  Generate A New Quiz
                                </button>
                             </motion.div>
                          )}

                        </div>
                      </>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB 1: OVERVIEW ── */}
          {activeTab === 'overview' && (
             <motion.div key="overview" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Current SGPA', value: currentGPA, desc: 'Based on active predicted grades', icon: '🎓', color: 'text-indigo-600', bg: 'bg-indigo-50/60', bColor: 'border-indigo-100' },
                  { label: 'Subjects at Risk', value: (subjects || []).filter(s=> getSubjectRisk(s.marks, s.attendance, s.assignments) !== 'Low').length, desc: 'Requires parameter adjustment', icon: '⚠️', color: 'text-amber-600', bg: 'bg-amber-50/60', bColor: 'border-amber-100' },
                  { label: 'Safe Subjects', value: (subjects || []).filter(s=> getSubjectRisk(s.marks, s.attendance, s.assignments) === 'Low').length, desc: 'Optimized progression pipeline metrics', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50/60', bColor: 'border-emerald-100' }
                ].map((kpi, idx) => (
                  <motion.div key={idx} variants={animItem} className={`p-6 rounded-[2rem] bg-white border ${kpi.bColor} shadow-sm flex items-center justify-between`}>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{kpi.label}</span>
                      <h3 className={`text-4xl font-black tracking-tight ${kpi.color}`}>{kpi.value}</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-2">{kpi.desc}</p>
                    </div>
                    <div className={`text-4xl p-4 rounded-2xl ${kpi.bg}`}>{kpi.icon}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
                {(subjects || []).map((s, i) => {
                  const riskLevel = getSubjectRisk(s.marks, s.attendance, s.assignments);
                  const config = riskConfig[riskLevel];
                  const grade = predictGradeLocal(s.marks, s.attendance, s.assignments);
                  const isExpanded = expanded === i;
                  
                  return (
                    <motion.div
                      key={s.id} layout variants={animItem}
                      onClick={() => setExpanded(isExpanded ? null : i)}
                      className={`bg-white p-6 rounded-[2rem] border transition-all cursor-pointer ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-200 shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-md border uppercase tracking-wider mb-2 inline-block" style={{ backgroundColor: config.bg, color: config.color, borderColor: config.border }}>
                            {s.subject_code}
                          </span>
                          <h4 className="text-base font-bold text-slate-800 tracking-tight">{s.subject_name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-slate-900 block tracking-tighter" style={{ color: config.color }}>{grade}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Predicted</span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5" style={{ backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
                        {config.label}
                      </div>

                      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 mb-4">
                        {[{ label: 'Marks', val: s.marks }, { label: 'Att.', val: s.attendance }, { label: 'Assign.', val: s.assignments }].map((bar, bIdx) => (
                          <div key={bIdx} className="space-y-1">
                            <span className="text-sm font-black text-slate-700 block">{bar.val}%</span>
                            <span className="text-[9px] uppercase font-black text-slate-400 tracking-tight block">{bar.label}</span>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${bar.val >= 75 ? 'bg-emerald-500' : bar.val >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${bar.val}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-3 mt-2">
                              <p className="font-bold text-indigo-600 flex items-center gap-1"><BrainCircuit size={14}/> Cortex Advisory Token</p>
                              <p className="leading-relaxed">
                                {riskLevel === 'High' ? `Your ${s.subject_code} parameters indicate structural risks. Adjusting focus allocation is mathematically required to prevent grade decay.` : 
                                 riskLevel === 'Medium' ? `Borderline threshold identified. Moving assignment scores slightly higher will optimize predictive gradient parameters.` : 
                                 "Optimal trajectory sustained. Current parameters indicate high resilience indices."}
                              </p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedSubject(s); setActiveTab('simulator'); }}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors"
                              >
                                Initialize Simulation Run
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── TAB 2: SIMULATOR ── */}
          {activeTab === 'simulator' && selectedSubject && (
            <motion.div key="simulator" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2"><Calculator className="text-indigo-600"/> Setup Simulation</h3>
                  <p className="text-slate-400 text-xs font-semibold mt-1">Alter operational variables to trace theoretical delta curves.</p>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">Target Curriculum Area</label>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
                    {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
                    {(subjects || []).map(sub => (
                      <button
                        key={sub.id} onClick={() => setSelectedSubject(sub)}
                        className={`w-full p-4 rounded-xl text-left border flex justify-between items-center transition-all ${selectedSubject.id === sub.id ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <span className={`text-sm font-bold ${selectedSubject.id === sub.id ? 'text-indigo-600' : 'text-slate-700'}`}>{sub.subject_code}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 border text-slate-500 font-mono">{sub.marks}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-6">
                  {[
                    { label: 'Internal Marks Delta', state: simMarks, setter: setSimMarks, color: 'accent-indigo-600 text-indigo-600 bg-indigo-50' },
                    { label: 'Attendance Track Metric', state: simAttendance, setter: setSimAttendance, color: 'accent-emerald-600 text-emerald-600 bg-emerald-50' },
                    { label: 'Expected Assignment Score', state: simAssignments, setter: setSimAssignments, color: 'accent-amber-600 text-amber-600 bg-amber-50' }
                  ].map((sld, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-black tracking-wider uppercase text-slate-500">
                        <span>{sld.label}</span>
                        <span className={`px-2 py-0.5 rounded-md text-sm font-black ${sld.color}`}>{sld.state}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={sld.state} onChange={(e) => sld.setter(Number(e.target.value))} className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${sld.color.split(' ')[0]}`} style={{ background: '#f1f5f9' }} />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => { setSimMarks(selectedSubject.marks); setSimAttendance(selectedSubject.attendance); setSimAssignments(selectedSubject.assignments); }}
                  className="w-full py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  ↩ Flush to Native Values
                </button>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="p-8 rounded-[3rem] border border-slate-200 bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">SGPA Core Projection</span>
                    <div className="flex items-center gap-6">
                      <div><span className="text-xs text-slate-400 font-bold block mb-1">Baseline</span><h4 className="text-3xl font-black text-slate-400">{currentGPA}</h4></div>
                      <span className="text-2xl text-slate-300 font-black">→</span>
                      <div><span className="text-xs text-indigo-500 font-bold block mb-1">Simulated</span><h4 className="text-4xl font-black text-slate-900">{simGPA}</h4></div>
                    </div>
                  </div>
                  <div className={`px-5 py-3 rounded-2xl font-black text-xl shadow-sm ${Number(gpaDiff) > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : Number(gpaDiff) < 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                    {Number(gpaDiff) > 0 ? '+' : ''}{gpaDiff} Margin
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Machine Learning Outcome: {selectedSubject.subject_code}</span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-4 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="text-center flex-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Original</span>
                        <div className="w-14 h-14 bg-white border rounded-xl flex items-center justify-center text-xl font-black text-slate-400 mx-auto">{predictGradeLocal(selectedSubject.marks, selectedSubject.attendance, selectedSubject.assignments)}</div>
                      </div>
                      <span className="text-slate-300 font-black">→</span>
                      <div className="text-center flex-1">
                        <span className="text-[10px] font-black uppercase text-indigo-600 block mb-1">Simulated</span>
                        <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black text-white mx-auto shadow-md shadow-indigo-200">{simGrade}</div>
                      </div>
                    </div>

                    <div className="md:col-span-8 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        The Scikit-Learn Random Forest model evaluates this parameter matrix as <strong className={mlPredictedRisk === 'High' ? 'text-rose-600' : mlPredictedRisk === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}>{mlPredictedRisk} Risk</strong>.
                        Adjusting your marks to {simMarks} and attendance to {simAttendance} will result in a {simGrade} profile.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-3">Live Scikit-Learn Predictor Flags</span>
                    <div className="grid grid-cols-3 gap-4">
                      {['Low', 'Medium', 'High'].map((lvl) => (
                        <div key={lvl} className={`p-4 rounded-xl border text-center transition-all ${mlPredictedRisk === lvl ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider block mb-1">{lvl} Risk</span>
                          <span className="text-lg font-black">{mlPredictedRisk === lvl ? 'ACTIVE' : 'IDLE'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB 3: FORECAST ── */}
          {activeTab === 'forecast' && (
            <motion.div key="forecast" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
               {(subjects || []).map((s) => {
                  const totalHeld = 40;
                  const attended = Math.round((s.attendance * totalHeld) / 100);
                  const left = 20;
                  const reqToClear = Math.ceil(0.75 * (totalHeld + left) - attended);
                  const safeSkip = left - reqToClear;
                  const cleared = s.attendance >= 75;

                  return (
                    <motion.div key={s.id} variants={animItem} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-bold tracking-tight text-slate-800">{s.subject_code}</h4>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${cleared ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {cleared ? '✓ Bounds Compliant' : '⚠️ Bounds Violation Alert'}
                          </span>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border text-lg ${cleared ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                          {s.attendance}%
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-400">
                          <span>Current Ledger: {attended}/{totalHeld} slots</span>
                          <span>Threshold: 75%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div className={`h-full ${cleared ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.attendance}%` }} />
                          <div className="absolute left-[75%] top-0 w-0.5 h-full bg-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                          <span className="text-lg font-black text-slate-800 block">{left}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400">Horizon Track</span>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${cleared ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <span className={`text-lg font-black block ${cleared ? 'text-emerald-600' : 'text-rose-600'}`}>{cleared ? Math.max(0, safeSkip) : reqToClear}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400">{cleared ? 'Permitted Skips' : 'Required Runs'}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}
            </motion.div>
          )}

          {/* ── TAB 4: WORKLOAD DISTRIBUTION BAR CHART (TECH PALETTE) ── */}
          {activeTab === 'effort' && (
            <motion.div key="effort" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* LEFT SUMMARY PANEL */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <Target size={20} className="text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-1">Workload Engine</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed mb-6">
                    Tasks are extracted dynamically from your AI Planner. The length of the bar shows the time commitment, while the color indicates task urgency.
                  </p>
                  
                  {/* Premium Tech Palette Legend */}
                  <div className="space-y-3 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#4f46e5]" /> High Priority</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]" /> Medium Priority</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600"><div className="w-3 h-3 rounded-full bg-[#38bdf8]" /> Low Priority</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm min-h-[200px]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Urgency Alerts</h3>
                  {(planTasks || []).length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        You have <span className="text-indigo-600 font-black">{(planTasks || []).filter(t => t.priority?.toLowerCase() === 'high').length} critical items</span> demanding immediate execution.
                      </p>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        Total time blocked on schedule: <span className="text-slate-800 font-black">{(planTasks || []).reduce((acc, curr) => acc + curr.minutes, 0)} minutes</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-6 text-slate-400 space-y-2">
                      <AlertTriangle size={24} className="text-slate-200" />
                      <p className="text-xs font-bold">No active tasks detected to analyze.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT GRAPH PANEL - HORIZONTAL BAR CHART */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center justify-center min-h-[500px] relative">
                {(planTasks || []).length === 0 ? (
                  <div className="text-center text-slate-400">
                    <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-sm">Action Plan empty.</p>
                    <p className="text-xs mt-1">Generate an AI Study Plan on your Dashboard first.</p>
                  </div>
                ) : (
                  <div className="w-full h-full pb-4">
                    <div className="mb-8 pl-4 border-l-4 border-indigo-600">
                      <h3 className="text-lg font-black tracking-tight text-slate-800">Workload & Urgency Distribution</h3>
                      <p className="text-xs font-medium text-slate-400 mt-1">Hover over any bar to view the exact module concepts you need to cover.</p>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={Math.max(400, (planTasks || []).length * 60)}>
                      <BarChart
                        data={planTasks || []}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                        <XAxis 
                          type="number" 
                          dataKey="minutes" 
                          name="Minutes" 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          fontWeight="bold"
                          tickFormatter={(val) => `${val}m`}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="subjectCode" 
                          stroke="#64748b" 
                          fontSize={12} 
                          fontWeight="black" 
                          width={60} 
                          tick={{ fill: '#475569' }}
                        />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const isHigh = data.priority?.toLowerCase() === 'high';
                              const isMed = data.priority?.toLowerCase() === 'medium';
                              const badgeBg = isHigh ? 'bg-[#4f46e5]' : isMed ? 'bg-[#8b5cf6]' : 'bg-[#38bdf8]';

                              return (
                                <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 max-w-[280px]">
                                  <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-50">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white ${badgeBg}`}>
                                      {data.priority || 'Medium'} Priority
                                    </span>
                                    <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                      <Clock size={12} className="text-slate-300"/> {data.minutes} mins
                                    </span>
                                  </div>
                                  <p className="font-black text-slate-800 text-sm mb-1">{data.subject}</p>
                                  <p className="text-xs font-semibold text-slate-500 leading-relaxed">{data.topic}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="minutes" 
                          radius={[0, 6, 6, 0]} 
                          barSize={24}
                          animationDuration={1500}
                        >
                          {/* 🛡️ OPTIONAL CHAINING ADDED HERE */}
                          {(planTasks || []).map((entry, index) => {
                            const prio = entry.priority?.toLowerCase() || 'medium';
                            const color = prio === 'high' ? '#4f46e5' : prio === 'medium' ? '#8b5cf6' : '#38bdf8';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      <style>{`
        input[type='range']::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: #4f46e5; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(79,70,229,0.2); cursor: pointer; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
      `}</style>
    </div>
  );
}