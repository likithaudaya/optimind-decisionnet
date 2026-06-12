import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, LineChart, Line, Legend, ComposedChart
} from 'recharts';
import { 
  BrainCircuit, Calculator, Activity, Database, UploadCloud, FileText, Send, 
  Sparkles, Target, Clock, AlertTriangle, MessageSquare, 
  GraduationCap, XCircle, Trash2, Eye, RotateCcw, Trophy, 
  BookOpen, TrendingUp, ChevronDown, ChevronUp, Star, User, Bot, History,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// ── HELPER FUNCTIONS ──
// ============================================================================

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

function loadQuizHistory() {
  try { return JSON.parse(localStorage.getItem('optimind_quiz_history') || '[]'); } 
  catch { return []; }
}

function saveQuizHistory(history) {
  try { localStorage.setItem('optimind_quiz_history', JSON.stringify(history)); } 
  catch {}
}

function loadHiddenTasks() {
  try { return JSON.parse(localStorage.getItem('optimind_hidden_tasks') || '[]'); }
  catch { return []; }
}

function saveHiddenTasks(hiddenIds) {
  try { localStorage.setItem('optimind_hidden_tasks', JSON.stringify(hiddenIds)); }
  catch {}
}

// ============================================================================
// ── MAIN COMPONENT ──
// ============================================================================

export default function Intelligence() {
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('vault'); 
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [planTasks, setPlanTasks] = useState([]);
  
  const [simMarks, setSimMarks] = useState(0);
  const [simAttendance, setSimAttendance] = useState(0);
  const [simAssignments, setSimAssignments] = useState(0);
  
  const [mlPredictedRisk, setMlPredictedRisk] = useState('Evaluating...');
  const [mlConfidence, setMlConfidence] = useState(null);
  const [isApiConnected, setIsApiConnected] = useState(false);
  
  // ── VAULT STATES (FIXED: Removed broken localStorage dependency) ──
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [vaultStats, setVaultStats] = useState({ indexed: 0, filename: '' });
  const [vaultFiles, setVaultFiles] = useState([]); // Pure cloud mirror now
  const [activeVaultFile, setActiveVaultFile] = useState(null);
  
  const [sandboxMode, setSandboxMode] = useState('chat');
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  
  const [quizData, setQuizData] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizHistoryList, setQuizHistoryList] = useState(loadQuizHistory());
  
  const [hiddenTaskIds, setHiddenTaskIds] = useState(loadHiddenTasks());
  const [showTaskManager, setShowTaskManager] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isQuerying]);

  useEffect(() => {
    async function fetchSubjects() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('academic_records')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: true });
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

  const fetchMatrixTasks = async () => {
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
  };

  useEffect(() => {
    fetchMatrixTasks();
  }, [user]);

  // ── REBUILT: Pure Supabase Cloud Synchronization ──
  const fetchVaultFiles = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setVaultFiles(data);
        if (data.length > 0 && vaultStats.indexed === 0) {
            setVaultStats({ indexed: data.length * 10, filename: data[0].filename }); 
        }
      }
    } catch (err) {
      console.error("Error fetching vault cloud records:", err);
    }
  };

  useEffect(() => {
    fetchVaultFiles();
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

  // ── VAULT INTERACTION LOGIC ──
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
      
      // Instantly refresh list from Cloud DB instead of faking local storage
      await fetchVaultFiles();
      setVaultStats({ indexed: data.total_indexed_chunks, filename: uploadedFile.name });
      
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error(err.message);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // ── FIXED: True Cloud Deletion ──
  const handleDeleteVaultFile = async (docId, storagePath) => {
    if(!window.confirm("Are you sure you want to permanently delete this document from your cloud memory?")) return;
    
    const toastId = toast.loading("Purging from cloud memory...");
    
    try {
      // 1. Remove PDF from Supabase Storage Bucket
      if (storagePath) {
        await supabase.storage.from('vault_files').remove([storagePath]);
      }
      
      // 2. Remove reference from Database (Cascade deletes embeddings if setup in SQL, or cleans up UI)
      const { error } = await supabase.from('vault_documents').delete().eq('id', docId);
      if (error) throw error;

      toast.success('Document purged successfully.', { id: toastId });
      
      // 3. Clear active states and re-fetch from database
      if (activeVaultFile?.id === docId) {
        setActiveVaultFile(null);
        setChatHistory([]);
      }
      await fetchVaultFiles();
      
    } catch (err) {
      console.error("Deletion failed", err);
      toast.error("Failed to delete document from cloud.", { id: toastId });
    }
  };

  const handleActivateVaultFile = (fileEntry) => {
    setActiveVaultFile(fileEntry);
    setVaultStats({ indexed: fileEntry.chunks || 20, filename: fileEntry.filename });
    setChatHistory([]);
    toast.success(`Now querying: ${fileEntry.filename}`);
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
    
    const correctAnswer = quizData?.[currentQIndex]?.correct_answer;
    if (option === correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    setIsAnswerRevealed(false);
    setSelectedOption(null);
    if(currentQIndex === (quizData?.length || 1) - 1) {
        handleQuizComplete(quizScore, quizData?.length || 0);
    }
    setCurrentQIndex(prev => prev + 1);
  };

  const handleQuizComplete = (finalScore, totalQuestions) => {
    const entry = {
      id: Date.now(),
      score: finalScore,
      total: totalQuestions,
      pct: Math.round((finalScore / (totalQuestions || 1)) * 100),
      file: activeVaultFile?.filename || vaultStats.filename || 'General Architecture',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    const updated = [entry, ...quizHistoryList].slice(0, 20); 
    setQuizHistoryList(updated);
    saveQuizHistory(updated);
  };

  const handleMarkTaskDone = async (taskId) => {
    const toastId = toast.loading("Removing task from database...");
    try {
      const { error } = await supabase
        .from('study_tasks')
        .update({ done: true })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Task completed and permanently removed from graph.', { id: toastId });
      
      const updatedHidden = hiddenTaskIds.filter(id => id !== taskId);
      setHiddenTaskIds(updatedHidden);
      saveHiddenTasks(updatedHidden);

      fetchMatrixTasks(); 
    } catch (err) {
      toast.error('Failed to update task.', { id: toastId });
      console.error(err);
    }
  };

  const toggleTaskVisibility = (taskId) => {
    const updated = hiddenTaskIds.includes(taskId)
      ? hiddenTaskIds.filter(id => id !== taskId)
      : [...hiddenTaskIds, taskId];
    setHiddenTaskIds(updated);
    saveHiddenTasks(updated);
  };

  const visibleTasks = (planTasks || []).filter(t => !hiddenTaskIds.includes(t.id));

  const currentGPA = useMemo(() => calcGPA(subjects), [subjects]);
  const simGrade = useMemo(() => predictGradeLocal(simMarks, simAttendance, simAssignments), [simMarks, simAttendance, simAssignments]);
  const simGPA = useMemo(() => {
    if (!selectedSubject) return "0.00";
    const updated = (subjects || []).map(s => s.id === selectedSubject.id ? { ...s, marks: simMarks, attendance: simAttendance, assignments: simAssignments } : s);
    return calcGPA(updated);
  }, [simMarks, simAttendance, simAssignments, selectedSubject, subjects]);
  const gpaDiff = (parseFloat(simGPA) - parseFloat(currentGPA)).toFixed(2);

  const getSubjectRisk = (m, a, as) => {
    const score = (m * 0.5) + (a * 0.3) + (as * 0.2);
    return (score < 55 || a < 65) ? 'High' : (score < 72 || a < 75 ? 'Medium' : 'Low');
  };

  const animContainer = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } } };
  const animItem = { hidden: { opacity: 0, scale: 0.97 }, visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } } };

  if (loading) {
    return (
      <div className="p-10 text-slate-500 font-medium animate-pulse flex items-center justify-center min-h-screen">
        <Activity className="mr-3 animate-spin"/> Initializing Neural Matrices...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-['Inter'] text-slate-900">
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/60 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 drop-shadow-sm">Intelligence Hub</h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-500 text-sm font-medium">Predictive ML matrices & RAG memory systems.</p>
            {!isApiConnected && (
               <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">Local Math Mode</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 max-w-max self-start md:self-auto gap-1">
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
              className={`relative px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-wider flex items-center rounded-full ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {activeTab === tab.id && <motion.div layoutId="activeIntelligenceTab" className="absolute inset-0 bg-indigo-600 rounded-full shadow-md shadow-indigo-200" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className="relative z-10 flex items-center">{tab.icon}{tab.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {subjects?.length === 0 && activeTab !== 'vault' ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <Activity className="text-slate-200 mb-6" size={64} />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Awaiting Data Streams</h2>
          <p className="text-slate-500 text-sm max-w-md text-center leading-relaxed">Your predictive models require baseline data. Please add your current semester subjects on the Dashboard first.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          
          {/* ── TAB 0: THE PREMIUM MEMORY VAULT ── */}
          {activeTab === 'vault' && (
            <motion.div key="vault" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="space-y-8">
              
              <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-indigo-500/20 text-indigo-200 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-400/30 backdrop-blur-sm">Cloud Tech Layer</span>
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-3 drop-shadow-md">Academic Memory Vault</h1>
                  <p className="text-indigo-200/80 text-sm max-w-xl font-medium leading-relaxed">
                    Upload textbooks or syllabus PDFs. Manage your cloud-embedded documents and test your knowledge against your personal RAG archive.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT SIDEBAR: INGESTION & FILE MANAGER */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Database size={16} className="text-indigo-600" /> Ingestion Control
                    </h3>
                    
                    <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer block transition-all group">
                      <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                      <UploadCloud size={40} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-3 transition-colors duration-300" />
                      <span className="block text-sm font-bold text-slate-700 mb-1 group-hover:text-indigo-700">
                        {isUploading ? 'Syncing to Cloud...' : 'Drop textbook PDF here'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-2">Max size 200MB</span>
                    </label>

                    {file && isUploading && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 bg-indigo-50 rounded-xl flex items-center gap-4 border border-indigo-100">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Activity className="text-indigo-600 animate-spin" size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">Vectorizing...</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* ── UPDATED VAULT FILE MANAGER (NO LOCAL STORAGE) ── */}
                  <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <BookOpen size={16} className="text-indigo-600" /> Vault Library
                      <span className="ml-auto text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{vaultFiles.length} files</span>
                    </h3>

                    {vaultFiles.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-xs font-bold text-slate-500">No documents stored.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {vaultFiles.map((f) => {
                          const isActive = activeVaultFile?.id === f.id;
                          // Maps the actual Supabase database keys (filename, created_at)
                          const displayDate = f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Recent';
                          
                          return (
                            <div key={f.id} className={`p-4 rounded-xl border transition-all duration-300 ${isActive ? 'border-indigo-300 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                  <FileText size={14} />
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className={`text-xs font-bold truncate ${isActive ? 'text-indigo-800' : 'text-slate-700'}`}>{f.filename || 'Unnamed Document'}</p>
                                  <p className="text-[10px] font-medium text-slate-400 mt-1">{displayDate} · Cloud Document</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/80">
                                <button
                                  onClick={() => handleActivateVaultFile(f)}
                                  disabled={isActive}
                                  className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`}
                                >
                                  <Eye size={12} /> {isActive ? 'Active Target' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDeleteVaultFile(f.id, f.storage_path)}
                                  className="px-3 py-2 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {quizHistoryList?.length > 0 && (
                      <div className="bg-white border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                        <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                          <History size={16} className="text-indigo-600" /> Recent Scores
                        </h3>
                        <div className="space-y-3">
                            {quizHistoryList.map((hist, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="min-w-0 pr-3">
                                        <p className="text-xs font-bold text-slate-700 truncate">{hist.file || hist.doc || 'General Quiz'}</p>
                                        <p className="text-[9px] font-medium uppercase tracking-wider text-slate-400 mt-0.5">{hist.date}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-black flex-shrink-0 ${hist.score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {hist.score}%
                                    </span>
                                </div>
                            ))}
                        </div>
                      </div>
                  )}
                </div>

                {/* RIGHT: Advanced Chat / Quiz / Score View */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white border border-slate-200/60 rounded-[2.5rem] shadow-sm flex flex-col min-h-[600px] max-h-[800px] overflow-hidden">
                    
                    {/* SLEEK SANDBOX HEADER */}
                    <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex flex-wrap items-center justify-between z-10 gap-4">
                      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200/80">
                        {[
                          { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
                          { id: 'quiz', icon: GraduationCap, label: 'Practice Quiz' },
                          { id: 'scores', icon: Trophy, label: 'Scores', count: quizHistoryList.length }
                        ].map(mode => (
                          <button 
                            key={mode.id} onClick={() => setSandboxMode(mode.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${sandboxMode === mode.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            <mode.icon size={14} /> {mode.label}
                            {mode.count > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ml-1 ${sandboxMode === mode.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>{mode.count}</span>}
                          </button>
                        ))}
                      </div>
                      
                      {activeVaultFile && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[180px]">
                            {activeVaultFile.filename}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── PREMIUM CHAT UI ── */}
                    {sandboxMode === 'chat' && (
                      <>
                        <div className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                          {(chatHistory || []).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
                                <BrainCircuit size={32} className="text-indigo-500" />
                              </div>
                              <h3 className="text-lg font-black text-slate-800 mb-2">Cortex Chat is Ready</h3>
                              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                                {vaultFiles.length > 0 ? 'Select a document from your vault on the left, then ask me anything to extract insights.' : 'Upload a PDF to the vault first to begin interacting with your data.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {(chatHistory || []).map((msg, idx) => (
                                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex gap-4 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  {msg.role === 'cortex' && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-md">
                                      <Bot size={16} />
                                    </div>
                                  )}
                                  
                                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm p-5 shadow-md' : 'bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm p-6 shadow-sm'}`}>
                                    {msg.role === 'cortex' && (
                                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 mb-3 border-b border-slate-50 pb-2">
                                        <Sparkles size={10} /> Cortex AI Synthesis
                                      </p>
                                    )}
                                    <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'font-medium' : 'text-slate-700 font-medium whitespace-pre-wrap'}`}>
                                      {msg.content}
                                    </p>

                                    {msg.context && (
                                      <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200/60 flex items-center gap-2">
                                          <Database size={12} className="text-slate-400" />
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Extraction</span>
                                        </div>
                                        <div className="p-3 max-h-32 overflow-y-auto custom-scrollbar">
                                          <p className="text-[10px] text-slate-500 font-mono leading-relaxed">{msg.context}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 mt-1 shadow-inner border border-slate-300">
                                      <User size={16} />
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                              
                              {isQuerying && (
                                <div className="flex gap-4 w-full justify-start">
                                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-1 animate-pulse">
                                      <Bot size={16} />
                                    </div>
                                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm p-5 shadow-sm flex items-center gap-3">
                                      <div className="flex gap-1">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                      </div>
                                      <span className="text-xs font-bold text-slate-400">Searching vector memory...</span>
                                    </div>
                                </div>
                              )}
                              <div ref={chatEndRef} />
                            </div>
                          )}
                        </div>

                        <form onSubmit={handleQuerySubmit} className="border-t border-slate-100 p-5 bg-white z-10">
                          <div className="relative flex items-center shadow-sm rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                            <input
                              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                              placeholder={isQuerying ? "Cortex is querying..." : vaultFiles.length > 0 ? "Message Cortex about your documents..." : "Upload a PDF first..."}
                              disabled={vaultFiles.length === 0 || isQuerying}
                              className="w-full pl-5 pr-14 py-4 bg-transparent text-sm font-medium outline-none text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                              type="submit" disabled={vaultFiles.length === 0 || isQuerying || !query.trim()}
                              className="absolute right-2 p-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                            >
                              <Send size={16} className={query.trim() && !isQuerying ? 'ml-0.5' : ''} />
                            </button>
                          </div>
                        </form>
                      </>
                    )}

                    {/* ── GAMIFIED QUIZ MODE ── */}
                    {sandboxMode === 'quiz' && (
                      <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 flex flex-col justify-center relative">
                        {quizData && currentQIndex < quizData.length && (
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
                            <motion.div 
                              className="h-full bg-indigo-600" 
                              initial={{ width: 0 }} 
                              animate={{ width: `${(currentQIndex / quizData.length) * 100}%` }} 
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        )}

                        {!quizData && !isGeneratingQuiz && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 max-w-md mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2">
                              <GraduationCap size={40} className="text-indigo-500" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-slate-900">Knowledge Extraction</h3>
                              <p className="text-sm text-slate-500 mt-2 leading-relaxed">Cortex will pull from your embedded chunks and dynamically generate a test.</p>
                            </div>
                            <button 
                              onClick={generateQuiz} 
                              disabled={vaultFiles.length === 0}
                              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                            >
                              Initialize Quiz Sequence
                            </button>
                            {vaultFiles.length === 0 && <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-1"><AlertCircle size={12}/> Vault Empty</p>}
                          </motion.div>
                        )}

                        {isGeneratingQuiz && (
                          <div className="text-center space-y-5">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto shadow-md" />
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Compiling Parameters...</p>
                          </div>
                        )}

                        {quizData && currentQIndex < (quizData?.length || 0) && (
                          <AnimatePresence mode="wait">
                            <motion.div key={currentQIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto w-full space-y-8">
                              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-200/60 pb-4">
                                <span className="flex items-center gap-2"><Target size={14}/> Question {currentQIndex + 1} <span className="text-slate-300">/</span> {quizData.length}</span>
                                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">Score: {quizScore}</span>
                              </div>

                              <h3 className="text-2xl font-black text-slate-900 leading-snug drop-shadow-sm">
                                {quizData[currentQIndex]?.question || "Missing Question from AI"}
                              </h3>

                              <div className="space-y-3 pt-2">
                                {(quizData[currentQIndex]?.options || []).map((opt, i) => {
                                  const isCorrect = opt === quizData[currentQIndex]?.correct_answer;
                                  const isSelected = opt === selectedOption;
                                  
                                  let btnClass = "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md hover:scale-[1.01] text-slate-700";
                                  if (isAnswerRevealed) {
                                    if (isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm scale-[1.01]";
                                    else if (isSelected) btnClass = "border-rose-500 bg-rose-50 text-rose-800 font-bold scale-[1.01]";
                                    else btnClass = "border-slate-200 bg-slate-50 opacity-40 scale-100";
                                  }

                                  return (
                                    <button
                                      key={i} onClick={() => handleAnswerSelect(opt)} disabled={isAnswerRevealed}
                                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer disabled:cursor-default flex items-center justify-between group ${btnClass}`}
                                    >
                                      <span className="font-semibold">{opt}</span>
                                      {isAnswerRevealed && isCorrect && <CheckCircle2 size={20} className="text-emerald-500" />}
                                      {isAnswerRevealed && isSelected && !isCorrect && <XCircle size={20} className="text-rose-500" />}
                                    </button>
                                  );
                                })}
                              </div>

                              {isAnswerRevealed && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mt-6 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 mb-2 relative z-10"><BrainCircuit size={14}/> Cortex Explanation</p>
                                  <p className="text-sm font-medium text-slate-300 leading-relaxed relative z-10">{quizData[currentQIndex]?.explanation || "No further context provided."}</p>
                                  
                                  <div className="flex justify-end mt-6 relative z-10">
                                    <button 
                                      onClick={nextQuestion}
                                      className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105"
                                    >
                                      {currentQIndex === (quizData.length) - 1 ? 'View Final Results' : 'Next Question ➔'}
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        )}

                        {quizData && currentQIndex >= (quizData?.length || 0) && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 max-w-md mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl">
                            <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-indigo-200/50">
                              <span className="text-4xl font-black text-white">{quizScore}/{quizData.length}</span>
                            </div>
                            <div>
                              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Quiz Complete</h3>
                              <p className="text-sm text-slate-500 mt-2 font-medium">You scored {Math.round((quizScore / (quizData.length || 1)) * 100)}% accuracy.</p>
                              <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 size={12} /> Score Logged
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                              <button onClick={generateQuiz} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md transition-all cursor-pointer">
                                Generate New Quiz
                              </button>
                              <button onClick={() => setSandboxMode('scores')} className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl border-2 border-slate-200 transition-all cursor-pointer">
                                View Leaderboard
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ── SCORE HISTORY PANEL ── */}
                    {sandboxMode === 'scores' && (
                      <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-50/30">
                        <div className="mb-8 flex justify-between items-end">
                          <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                              <Trophy size={28} className="text-amber-500" /> Score Ledger
                            </h3>
                            <p className="text-sm text-slate-500 font-medium mt-1">Your historical performance matrix.</p>
                          </div>
                          {quizHistoryList.length > 0 && (
                            <button onClick={() => { setQuizHistoryList([]); saveQuizHistory([]); }} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">
                              Clear Ledger
                            </button>
                          )}
                        </div>

                        {quizHistoryList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <Star size={48} className="text-slate-200 mb-4" />
                            <p className="text-lg font-black text-slate-700">No Data Available</p>
                            <p className="text-sm text-slate-400 mt-1 mb-6">Complete your first knowledge check to populate the ledger.</p>
                            <button onClick={() => setSandboxMode('quiz')} className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors shadow-md">
                              Initialize Quiz
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                              {[
                                { label: 'Peak Accuracy', value: Math.max(...quizHistoryList.map(h => h.pct)) + '%', color: 'text-emerald-600', icon: TrendingUp },
                                { label: 'Avg Rating', value: Math.round(quizHistoryList.reduce((s, h) => s + h.pct, 0) / quizHistoryList.length) + '%', color: 'text-indigo-600', icon: Activity },
                                { label: 'Modules Cleared', value: quizHistoryList.length, color: 'text-slate-800', icon: BookOpen },
                              ].map(s => (
                                <div key={s.label} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                                  <s.icon size={16} className={`${s.color} mb-3 opacity-60`} />
                                  <div>
                                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {quizHistoryList.length >= 2 && (
                              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Performance Trajectory</p>
                                <ResponsiveContainer width="100%" height={140}>
                                  <LineChart data={[...quizHistoryList].reverse().map((h, i) => ({ attempt: i + 1, score: h.pct }))}>
                                    <defs>
                                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="attempt" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={({ active, payload }) => active && payload?.length ? ( <div className="bg-slate-900 text-white p-2 rounded-lg text-xs font-bold">{payload[0].value}%</div> ) : null} />
                                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}

                            <div className="bg-white border border-slate-200/80 rounded-[2rem] p-3 shadow-sm">
                              {quizHistoryList.map((h, idx) => (
                                <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border-2
                                      ${h.pct >= 80 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : h.pct >= 50 ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                      {h.pct}%
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{h.file}</p>
                                      <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5"><Clock size={10}/> {h.date} <span className="text-slate-300">|</span> {h.score} of {h.total} correct</p>
                                    </div>
                                  </div>
                                  <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg 
                                    ${h.pct >= 80 ? 'text-emerald-500' : h.pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {h.pct >= 80 ? 'Optimal' : h.pct >= 50 ? 'Standard' : 'Review'}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
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
                  <motion.div key={idx} variants={animItem} className={`p-6 rounded-[2rem] bg-white border ${kpi.bColor} shadow-sm hover:shadow-md transition-shadow flex items-center justify-between`}>
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
                {(subjects || []).map((s, i) => {
                  const riskLevel = getSubjectRisk(s.marks, s.attendance, s.assignments);
                  const config = riskConfig[riskLevel];
                  const grade = predictGradeLocal(s.marks, s.attendance, s.assignments);
                  const isExpanded = expanded === i;
                  
                  return (
                    <motion.div
                      key={s.id} layout variants={animItem}
                      onClick={() => setExpanded(isExpanded ? null : i)}
                      className={`bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer ${isExpanded ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-lg' : 'border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-md'}`}
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

                      <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-5 mb-2">
                        {[{ label: 'Marks', val: s.marks }, { label: 'Att.', val: s.attendance }, { label: 'Assign.', val: s.assignments }].map((bar, bIdx) => (
                          <div key={bIdx} className="space-y-1.5">
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
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4">
                            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-4 shadow-inner">
                              <p className="font-black tracking-widest uppercase text-indigo-400 flex items-center gap-1.5 text-[10px]"><BrainCircuit size={14}/> Cortex Advisory</p>
                              <p className="leading-relaxed font-medium">
                                {riskLevel === 'High' ? `Your ${s.subject_code} parameters indicate structural risks. Adjusting focus allocation is mathematically required to prevent grade decay.` : 
                                 riskLevel === 'Medium' ? `Borderline threshold identified. Moving assignment scores slightly higher will optimize predictive gradient parameters.` : 
                                 "Optimal trajectory sustained. Current parameters indicate high resilience indices."}
                              </p>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedSubject(s); setActiveTab('simulator'); }}
                                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md transition-all"
                              >
                                Initialize Simulation
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
              <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 mb-2"><Calculator className="text-indigo-600"/> Setup Sim</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">Alter operational variables below to trace theoretical delta curves.</p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Curriculum Area</label>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {(subjects || []).map(sub => (
                      <button
                        key={sub.id} onClick={() => setSelectedSubject(sub)}
                        className={`w-full p-4 rounded-2xl text-left border-2 flex justify-between items-center transition-all ${selectedSubject.id === sub.id ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}
                      >
                        <span className={`text-sm font-bold ${selectedSubject.id === sub.id ? 'text-indigo-700' : 'text-slate-700'}`}>{sub.subject_code}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${selectedSubject.id === sub.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{sub.marks}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-7">
                  {[
                    { label: 'Internal Marks Delta', state: simMarks, setter: setSimMarks, color: 'accent-indigo-600 text-indigo-700 bg-indigo-50 border-indigo-100' },
                    { label: 'Attendance Track Metric', state: simAttendance, setter: setSimAttendance, color: 'accent-emerald-600 text-emerald-700 bg-emerald-50 border-emerald-100' },
                    { label: 'Expected Assignment', state: simAssignments, setter: setSimAssignments, color: 'accent-amber-600 text-amber-700 bg-amber-50 border-amber-100' }
                  ].map((sld, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">{sld.label}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-black border ${sld.color}`}>{sld.state}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={sld.state} onChange={(e) => sld.setter(Number(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${sld.color.split(' ')[0]}`} style={{ background: '#f1f5f9' }} />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => { setSimMarks(selectedSubject.marks); setSimAttendance(selectedSubject.attendance); setSimAssignments(selectedSubject.assignments); }}
                  className="w-full py-4 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  ↩ Flush to Native Values
                </button>
              </div>

              <div className="lg:col-span-8 space-y-6">
                {/* SGPA Banner */}
                <div className="p-8 lg:p-10 rounded-[3rem] border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">SGPA Core Projection</span>
                    <div className="flex items-center gap-6 lg:gap-10">
                      <div><span className="text-xs text-slate-400 font-bold block mb-1">Baseline</span><h4 className="text-4xl font-black text-slate-300">{currentGPA}</h4></div>
                      <span className="text-3xl text-slate-200 font-black">➔</span>
                      <div><span className="text-xs text-indigo-500 font-bold block mb-1">Simulated Target</span><h4 className="text-5xl font-black text-slate-900 tracking-tighter">{simGPA}</h4></div>
                    </div>
                  </div>
                  <div className={`px-6 py-4 rounded-3xl font-black text-2xl shadow-sm border-2 ${Number(gpaDiff) > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : Number(gpaDiff) < 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {Number(gpaDiff) > 0 ? '+' : ''}{gpaDiff} Margin
                  </div>
                </div>

                {/* ML Engine Card */}
                <div className="bg-slate-900 p-8 lg:p-10 rounded-[3rem] shadow-xl space-y-8 relative overflow-hidden">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
                  
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block relative z-10">Machine Learning Outcome: {selectedSubject.subject_code}</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
                    <div className="md:col-span-5 flex items-center justify-between bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                      <div className="text-center flex-1">
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Original</span>
                        <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-400 mx-auto">{predictGradeLocal(selectedSubject.marks, selectedSubject.attendance, selectedSubject.assignments)}</div>
                      </div>
                      <span className="text-slate-600 font-black text-xl">➔</span>
                      <div className="text-center flex-1">
                        <span className="text-[10px] font-black uppercase text-indigo-400 block mb-2">Simulated</span>
                        <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto shadow-[0_0_20px_rgba(99,102,241,0.4)]">{simGrade}</div>
                      </div>
                    </div>

                    <div className="md:col-span-7 p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        The Scikit-Learn Random Forest model evaluates this parameter matrix as <strong className={mlPredictedRisk === 'High' ? 'text-rose-400' : mlPredictedRisk === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}>{mlPredictedRisk} Risk</strong>.
                        Adjusting marks to {simMarks} and attendance to {simAttendance} sets your trajectory to a {simGrade} profile.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-6 relative z-10">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-4">Live Scikit-Learn Predictor Flags</span>
                    <div className="grid grid-cols-3 gap-4">
                      {['Low', 'Medium', 'High'].map((lvl) => {
                        const isActive = mlPredictedRisk === lvl;
                        let activeColor = isActive && lvl === 'Low' ? 'bg-emerald-500 border-emerald-400' : isActive && lvl === 'Medium' ? 'bg-amber-500 border-amber-400' : isActive ? 'bg-rose-500 border-rose-400' : '';
                        
                        return (
                          <div key={lvl} className={`p-4 rounded-2xl border-2 text-center transition-all duration-300 ${isActive ? `${activeColor} text-white shadow-lg` : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest block mb-1">{lvl} Risk</span>
                            <span className="text-xl font-black tracking-tight">{isActive ? 'ACTIVE' : 'IDLE'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TAB 3: FORECAST ── */}
          {activeTab === 'forecast' && (
            <motion.div key="forecast" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(subjects || []).map((s) => {
                  const totalHeld = 40;
                  const attended = Math.round((s.attendance * totalHeld) / 100);
                  const left = 20;
                  const reqToClear = Math.ceil(0.75 * (totalHeld + left) - attended);
                  const safeSkip = left - reqToClear;
                  const cleared = s.attendance >= 75;

                  return (
                    <motion.div key={s.id} variants={animItem} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-black tracking-tight text-slate-900">{s.subject_code}</h4>
                          <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${cleared ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {cleared ? '✓ Compliant' : '⚠️ Violation Risk'}
                          </span>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black border-2 text-xl ${cleared ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                          {s.attendance}%
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Ledger: {attended}/{totalHeld}</span>
                          <span>Target: 75%</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
                          <div className={`h-full rounded-full transition-all duration-1000 ${cleared ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.attendance}%` }} />
                          <div className="absolute left-[75%] top-0 w-1 h-full bg-slate-900" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 text-center">
                          <span className="text-3xl font-black text-slate-800 block mb-1">{left}</span>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Horizon Track</span>
                        </div>
                        <div className={`p-4 rounded-2xl border-2 text-center ${cleared ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                          <span className={`text-3xl font-black block mb-1 ${cleared ? 'text-emerald-600' : 'text-rose-600'}`}>{cleared ? Math.max(0, safeSkip) : reqToClear}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{cleared ? 'Safe Skips' : 'Required Runs'}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
               })}
            </motion.div>
          )}

          {/* ── TAB 4: ADVANCED WORKLOAD ANALYSIS ── */}
          {activeTab === 'effort' && (
            <motion.div key="effort" variants={animContainer} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              
              {/* LEFT SUMMARY PANEL */}
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-[2.5rem] p-8 shadow-xl text-white">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 border border-indigo-400/30 backdrop-blur-sm">
                    <Target size={24} className="text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight mb-2">Workload Engine</h3>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed mb-6">
                    Tasks drawn from your AI Planner. Filter them below to refine your analytical projection.
                  </p>
                  
                  <div className="space-y-4 border-t border-slate-700/50 pt-6">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" /> High Priority Block</div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" /> Medium Priority Block</div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> Low Priority Block</div>
                  </div>
                </div>

                {/* TASK MANAGER COMPONENT */}
                <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter Matrix</h3>
                    <button onClick={() => setShowTaskManager(!showTaskManager)} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1">
                      {showTaskManager ? 'Hide Config' : 'Manage Config'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showTaskManager && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        {(planTasks || []).length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs font-bold text-slate-400">No tasks populated.</div>
                        ) : (
                          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                            {(planTasks || []).map(task => {
                              const isHidden = hiddenTaskIds.includes(task.id);
                              const prio = task.priority?.toLowerCase() || 'medium';
                              const color = prio === 'high' ? '#f43f5e' : prio === 'medium' ? '#f59e0b' : '#10b981';
                              return (
                                <div key={task.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${isHidden ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    <p className={`text-xs font-bold truncate ${isHidden ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.subjectCode}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => toggleTaskVisibility(task.id)} className={`flex-1 text-[9px] font-black uppercase tracking-wider py-1.5 rounded-lg transition-all ${isHidden ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                      {isHidden ? 'Show' : 'Hide'}
                                    </button>
                                    <button onClick={() => handleMarkTaskDone(task.id)} className="flex-1 text-[9px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1">
                                      Done <CheckCircle2 size={10} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {hiddenTaskIds.length > 0 && (
                          <button onClick={() => { setHiddenTaskIds([]); localStorage.removeItem('optimind_hidden_tasks'); }} className="w-full mt-4 text-[10px] uppercase tracking-widest font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors py-3 rounded-xl">
                            Restore Full Matrix
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showTaskManager && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-500">
                        {hiddenTaskIds.length > 0 
                          ? <><span className="text-indigo-600 font-bold">{hiddenTaskIds.length} tasks</span> excluded from projection.</>
                          : 'Full dataset currently visualized.'}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-100">
                     <p className="text-xs font-bold text-slate-600 leading-relaxed mb-3">
                        Total projected workload: <span className="text-slate-900 font-black text-sm">{visibleTasks.reduce((acc, curr) => acc + curr.minutes, 0)} mins</span>.
                      </p>
                      <button onClick={fetchMatrixTasks} className="w-full text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-3 rounded-xl border border-indigo-100 transition-colors flex items-center justify-center gap-2">
                        <RotateCcw size={12}/> Refresh Sync
                      </button>
                  </div>
                </div>
              </div>

              {/* RIGHT GRAPH PANEL — Premium Modern Recharts Grid */}
              <div className="xl:col-span-3">
                {visibleTasks.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm flex flex-col items-center justify-center min-h-[600px] h-full">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                      <Activity size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">Matrix Empty</h3>
                    <p className="font-medium text-sm text-slate-400 max-w-sm text-center">
                      {(planTasks || []).length > 0 ? 'All tasks are filtered out. Use the Task Manager on the left to restore visibility.' : 'Your Action Plan is empty. Generate an AI Study Plan on your Dashboard first.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    
                    {/* CHART 1: COMPOSED TIMELINE */}
                    <div className="bg-white border border-slate-200/80 rounded-[3rem] p-8 shadow-sm flex flex-col lg:col-span-2">
                      <div className="mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-slate-900">Workload Allocation & Urgency Trend</h3>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Minutes mapped against task criticality</p>
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={visibleTasks} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="barGradientHigh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/><stop offset="100%" stopColor="#e11d48" stopOpacity={0.8}/></linearGradient>
                              <linearGradient id="barGradientMedium" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/><stop offset="100%" stopColor="#d97706" stopOpacity={0.8}/></linearGradient>
                              <linearGradient id="barGradientLow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={1}/><stop offset="100%" stopColor="#059669" stopOpacity={0.8}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subjectCode" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(val) => `${val}m`} />
                            <Tooltip
                              cursor={{ fill: 'transparent' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const isHigh = data.priority?.toLowerCase() === 'high';
                                  const isMed = data.priority?.toLowerCase() === 'medium';
                                  const badgeClass = isHigh ? 'bg-rose-50 text-rose-600 border-rose-100' : isMed ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                  return (
                                    <div className="bg-slate-900/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-slate-700 max-w-[240px]">
                                      <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${badgeClass}`}>{data.priority}</span>
                                        <span className="text-[11px] font-black text-white flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {data.minutes}m</span>
                                      </div>
                                      <p className="font-black text-white text-sm mb-1.5 leading-snug">{data.subject}</p>
                                      <p className="text-xs font-medium text-slate-400 leading-relaxed">{data.topic}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={1500}>
                              {visibleTasks.map((entry, index) => {
                                const prio = entry.priority?.toLowerCase() || 'medium';
                                const gradient = prio === 'high' ? 'url(#barGradientHigh)' : prio === 'medium' ? 'url(#barGradientMedium)' : 'url(#barGradientLow)';
                                return <Cell key={`cell-${index}`} fill={gradient} />;
                              })}
                            </Bar>
                            <Line type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, strokeWidth: 0 }} animationDuration={2000} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CHART 2: PRIORITY DISTRO */}
                    {(() => {
                      const grouped = visibleTasks.reduce((acc, t) => {
                        const sub = t.subjectCode;
                        if (!acc[sub]) acc[sub] = { subject: sub, high: 0, medium: 0, low: 0 };
                        const p = t.priority?.toLowerCase() || 'medium';
                        acc[sub][p] = (acc[sub][p] || 0) + t.minutes;
                        return acc;
                      }, {});
                      const groupedData = Object.values(grouped);

                      return (
                        <div className="bg-white border border-slate-200/80 rounded-[3rem] p-8 shadow-sm flex flex-col">
                          <div className="mb-6 flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                            <h3 className="text-base font-black tracking-tight text-slate-900">Priority Spread</h3>
                          </div>
                          <div className="flex-1 min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={groupedData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="subject" fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} dy={8} />
                                <YAxis fontSize={10} tickFormatter={v => `${v}m`} stroke="#94a3b8" axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} content={({ active, payload, label }) => active && payload?.length ? (
                                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[160px]">
                                    <p className="text-sm font-black text-slate-900 mb-3 border-b border-slate-100 pb-2">{label}</p>
                                    <div className="space-y-2">
                                      {payload.map(p => (
                                        <div key={p.dataKey} className="flex justify-between items-center text-xs font-bold">
                                          <span className="flex items-center gap-2 text-slate-500">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
                                            {p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}
                                          </span>
                                          <span className="text-slate-900">{p.value}m</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null} />
                                <Bar dataKey="high" fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1000} />
                                <Bar dataKey="medium" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1200} />
                                <Bar dataKey="low" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" animationDuration={1400} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}

                    {/* CHART 3: PERFORMANCE RADAR */}
                    {subjects?.length >= 3 ? (
                      <div className="bg-white border border-slate-200/80 rounded-[3rem] p-8 shadow-sm flex flex-col">
                        <div className="mb-6 flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-sky-500 rounded-full" />
                          <h3 className="text-base font-black tracking-tight text-slate-900">Academic Radar</h3>
                        </div>
                        <div className="flex-1 min-h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={(subjects || []).map(s => ({ subject: s.subject_code, Marks: s.marks, Attendance: s.attendance, Assignments: s.assignments }))} outerRadius="70%">
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                              <Radar name="Marks" dataKey="Marks" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={2} />
                              <Radar name="Attendance" dataKey="Attendance" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                              <Radar name="Assignments" dataKey="Assignments" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                              <Tooltip content={({ active, payload }) => active && payload?.length ? (
                                <div className="bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-700 text-xs font-bold text-white min-w-[140px] space-y-2">
                                  <p className="text-slate-400 mb-1 border-b border-slate-700 pb-2">{payload[0].payload.subject}</p>
                                  {payload.map(p => (
                                    <p key={p.name} style={{ color: p.stroke }} className="flex justify-between">
                                      <span>{p.name}</span><span>{p.value}%</span>
                                    </p>
                                  ))}
                                </div>
                              ) : null} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-[3rem] p-8 shadow-inner flex flex-col items-center justify-center text-center">
                        <Radar size={32} className="text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-500">Radar Offline</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Add at least 3 subjects to unlock the multi-dimensional radar visualization.</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        input[type='range']::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: #4f46e5; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(79,70,229,0.2); cursor: pointer; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}