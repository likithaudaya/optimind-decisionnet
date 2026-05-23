import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../store/authStore'
import { Plus, X, BrainCircuit, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  
  const [liveProfile, setLiveProfile] = useState(profile)
  const [greeting, setGreeting] = useState('')
  const [time, setTime] = useState(new Date())
  
  // LIVE DATA STATES
  const [subjects, setSubjects] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', code: '', marks: '', attendance: '', assignments: '' })
  const [isAdding, setIsAdding] = useState(false)

  // 1. FETCH REAL DATA FROM SUPABASE
  const fetchLiveSubjects = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('academic_records')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true });
      
    if (data) setSubjects(data);
    if (error) console.error("Error fetching subjects:", error);
  }

  useEffect(() => {
    fetchLiveSubjects();
    setLiveProfile(profile);
  }, [user, profile]);

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. INSERT NEW REAL SUBJECT TO SUPABASE
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.code) {
      return toast.error("Please fill out the subject name and code.");
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('academic_records')
        .insert({
          student_id: user.id,
          subject_name: newSubject.name,
          subject_code: newSubject.code.toUpperCase(),
          marks: parseInt(newSubject.marks) || 0,
          attendance: parseInt(newSubject.attendance) || 0,
          assignments: parseInt(newSubject.assignments) || 0
        });

      if (error) throw error;
      
      toast.success("Subject safely recorded!");
      setNewSubject({ name: '', code: '', marks: '', attendance: '', assignments: '' });
      setIsModalOpen(false);
      fetchLiveSubjects(); // Instantly refresh the UI!

    } catch (err) {
      toast.error(`Failed to add subject: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  }

  // A quick helper to determine simple grade/risk on the frontend until we hit the ML model
  const calcRisk = (marks, att) => (marks < 60 || att < 75) ? 'High' : (marks < 75 || att < 85) ? 'Medium' : 'Low';
  const calcGrade = (marks) => marks >= 90 ? 'A+' : marks >= 80 ? 'A' : marks >= 70 ? 'B+' : marks >= 60 ? 'B' : 'C';

  const avgMarks = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + s.marks, 0) / subjects.length) : 0;
  const avgAtt = subjects.length ? Math.round(subjects.reduce((acc, s) => acc + s.attendance, 0) / subjects.length) : 0;
  const highRiskCount = subjects.filter(s => calcRisk(s.marks, s.attendance) === 'High').length;

  const optiScore = liveProfile?.opti_score ?? 0;
  const firstName = liveProfile?.full_name?.split(' ')[0] ?? 'Student';
  const initial = liveProfile?.full_name?.[0]?.toUpperCase() ?? 'S';

  return (
    <div className="font-['Inter'] text-slate-900 pb-12">

      {/* TOP HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center shadow-md shadow-indigo-200">
          {initial}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Opti Score */}
        <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-lg shadow-indigo-100 flex flex-col justify-between">
          <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Opti Score™</p>
          <div className="text-4xl font-black mb-2">{optiScore}<span className="text-lg opacity-60 font-medium">/100</span></div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full" style={{ width: `${optiScore}%` }} />
          </div>
        </div>

        {/* Avg Attendance */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avg Attendance</p>
          <div className="text-3xl font-black text-slate-800">{avgAtt}<span className="text-lg text-slate-400 font-medium">%</span></div>
          <p className={`text-xs font-bold mt-2 ${avgAtt >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {avgAtt >= 75 ? '✓ Above minimum threshold' : '⚠ Below 75% boundary'}
          </p>
        </div>

        {/* Avg Marks */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avg Marks</p>
          <div className="text-3xl font-black text-slate-800">{avgMarks}<span className="text-lg text-slate-400 font-medium">%</span></div>
          <p className="text-xs font-bold mt-2 text-indigo-500">Live aggregated metrics</p>
        </div>

        {/* Risk Alerts */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">High-Risk Subjects</p>
          <div className="text-3xl font-black text-slate-800">{highRiskCount}<span className="text-lg text-slate-400 font-medium"> / {subjects.length}</span></div>
          <p className={`text-xs font-bold mt-2 ${highRiskCount === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {highRiskCount === 0 ? 'All subjects stable' : 'Requires immediate attention'}
          </p>
        </div>
      </div>

      {/* REAL ACADEMIC RECORDS TABLE */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Academic Records</h2>
            <p className="text-sm text-slate-500 font-medium">Your live semester progression data</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-colors"
          >
            <Plus size={16} /> Add Subject
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Activity className="mx-auto text-slate-300 mb-3" size={40} />
            <h3 className="text-slate-600 font-bold mb-1">No subjects found</h3>
            <p className="text-sm text-slate-400">Click "Add Subject" to begin tracking your performance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                  <th className="pb-4">Subject Name</th>
                  <th className="pb-4">Code</th>
                  <th className="pb-4">Marks</th>
                  <th className="pb-4">Attendance</th>
                  <th className="pb-4">Est. Grade</th>
                  <th className="pb-4">Baseline Risk</th>
                </tr>
              </thead>
              <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-50">
                {subjects.map((sub) => {
                  const risk = calcRisk(sub.marks, sub.attendance);
                  const grade = calcGrade(sub.marks);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-slate-900 font-bold">{sub.subject_name}</td>
                      <td className="py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-500">{sub.subject_code}</span></td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8">{sub.marks}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${sub.marks >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${sub.marks}%` }} /></div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8">{sub.attendance}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${sub.attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${sub.attendance}%` }} /></div>
                        </div>
                      </td>
                      <td className="py-4 font-black">{grade}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                          risk === 'Low' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                          risk === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
                          'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                          {risk}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD SUBJECT MODAL OVERLAY ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-1">Add New Subject</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Enter your current scores. If you don't know your final marks yet, enter your <strong>expected</strong> or <strong>target</strong> scores to calculate your current risk!</p>

            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject Name</label>
                <input type="text" placeholder="e.g. Database Management" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Subject Code</label>
                  <input type="text" placeholder="e.g. DBMS" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Avg. Assignment Score (%)</label>
                  <input type="number" min="0" max="100" placeholder="e.g. 85" value={newSubject.assignments} onChange={e => setNewSubject({...newSubject, assignments: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Marks (0-100)</label>
                  <input type="number" min="0" max="100" placeholder="0" value={newSubject.marks} onChange={e => setNewSubject({...newSubject, marks: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Attendance (0-100)</label>
                  <input type="number" min="0" max="100" placeholder="0" value={newSubject.attendance} onChange={e => setNewSubject({...newSubject, attendance: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-600 transition-colors" />
                </div>
              </div>
              <button type="submit" disabled={isAdding} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl mt-6 transition-colors shadow-md shadow-indigo-100">
                {isAdding ? 'Saving to Database...' : 'Save Academic Record'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}