import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, RotateCcw, Download, Moon, Sun, PlusCircle, GraduationCap, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import { auth } from './supabase-config';

const GRADE_POINTS = {
  'A': 4.00, 'A-': 3.75, 'B+': 3.50, 'B': 3.00, 'B-': 2.75, 'C+': 2.50, 'C': 2.00, 'C-': 1.75, 'D+': 1.50, 'D': 1.00, 'F': 0.00
};

const INITIAL_SUBJECT = { title: '', creditHours: '', grade: '' };

function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);

  // App State
  const [semesters, setSemesters] = useState(() => {
    const saved = localStorage.getItem('uol-pro-data');
    return saved ? JSON.parse(saved) : [{ id: 1, subjects: [{ ...INITIAL_SUBJECT, id: 101 }] }];
  });

  const [currentGPA, setCurrentGPA] = useState(() => localStorage.getItem('uol-pro-gpa') || '');
  const [totalCreditsDone, setTotalCreditsDone] = useState(() => localStorage.getItem('uol-pro-credits') || '');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('uol-theme') === 'dark');
  const [installPrompt, setInstallPrompt] = useState(null);
  const loadedUserId = useRef(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const [profile, setProfile] = useState({ name: '', rollNo: '', program: '' });
  const [targetGPA, setTargetGPA] = useState('');
  const [targetCredits, setTargetCredits] = useState('');
  const [isSandbox, setIsSandbox] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataEncoded = urlParams.get('data');
    if (dataEncoded) {
      try {
        const sharedSemesters = JSON.parse(atob(dataEncoded));
        setSemesters(sharedSemesters);
        setIsSandbox(true);
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
         console.error('Invalid share link');
      }
    }
  }, []);

  // Monitor Auth State
  useEffect(() => {
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setShowAuthModal(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { data, error } = isLoginView 
      ? await auth.signInWithPassword({ email, password })
      : await auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
    } else if (data.user) {
      setShowAuthModal(false);
    }
  };

  // Use strictly supabase auth ID, do not default to guest
  const userId = user ? user.id : null;

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') setInstallPrompt(null);
      });
    }
  };

  useEffect(() => {
    if (!userId) return; // Do not fetch or modify data while logged out!
    
    // 1. Immediately load local offline data synchronously to prevent blanking
    const saved = localStorage.getItem(`uol-pro-data-${userId}`);
    if (saved) {
      setSemesters(JSON.parse(saved));
      setCurrentGPA(localStorage.getItem(`uol-pro-gpa-${userId}`) || '');
      setTotalCreditsDone(localStorage.getItem(`uol-pro-credits-${userId}`) || '');
      const savedProfile = localStorage.getItem(`uol-pro-profile-${userId}`);
      if(savedProfile) setProfile(JSON.parse(savedProfile));
    } else {
      setSemesters([{ id: 1, subjects: [{ ...INITIAL_SUBJECT, id: 101 }] }]);
      setCurrentGPA('');
      setTotalCreditsDone('');
      setProfile({ name: '', rollNo: '', program: '' });
    }
    loadedUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId || loadedUserId.current !== userId || isSandbox) return;
    localStorage.setItem(`uol-pro-data-${userId}`, JSON.stringify(semesters));
    localStorage.setItem(`uol-pro-gpa-${userId}`, currentGPA);
    localStorage.setItem(`uol-pro-credits-${userId}`, totalCreditsDone);
    localStorage.setItem(`uol-pro-profile-${userId}`, JSON.stringify(profile));
  }, [semesters, currentGPA, totalCreditsDone, userId, profile]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('uol-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const addSemester = () => {
    setSemesters([...semesters, { id: Date.now(), subjects: [{ ...INITIAL_SUBJECT, id: Date.now() + 1 }] }]);
  };

  const removeSemester = (id) => {
    setSemesters(semesters.filter(s => s.id !== id));
  };

  const addSubject = (semId) => {
    setSemesters(semesters.map(s => s.id === semId ? { ...s, subjects: [...s.subjects, { ...INITIAL_SUBJECT, id: Date.now() }] } : s));
  };

  const updateSubject = (semId, subId, field, val) => {
    setSemesters(semesters.map(s => s.id === semId ? {
      ...s, subjects: s.subjects.map(sub => sub.id === subId ? { ...sub, [field]: val } : sub)
    } : s));
  };

  const removeSubject = (semId, subId) => {
    setSemesters(semesters.map(s => s.id === semId ? {
      ...s, subjects: s.subjects.filter(sub => sub.id !== subId)
    } : s));
  };

  const resetData = () => {
    if (confirm("Reset everything?")) {
      setSemesters([{ id: 1, subjects: [{ ...INITIAL_SUBJECT, id: 101 }] }]);
      setCurrentGPA('');
      setTotalCreditsDone('');
    }
  };

  const stats = useMemo(() => {
    let grandPoints = 0, grandCredits = 0;
    const prevGPA = parseFloat(currentGPA), prevCrs = parseFloat(totalCreditsDone);
    if (!isNaN(prevGPA) && !isNaN(prevCrs) && prevCrs > 0) { grandPoints += prevGPA * prevCrs; grandCredits += prevCrs; }
    const semList = semesters.map(s => {
      let pts = 0, crs = 0;
      s.subjects.forEach(sub => {
        const c = parseFloat(sub.creditHours);
        const p = GRADE_POINTS[sub.grade];
        if (c > 0 && p !== undefined) { pts += c * p; crs += c; }
      });
      grandPoints += pts; grandCredits += crs;
      return { gpa: crs > 0 ? (pts / crs).toFixed(2) : '0.00', credits: crs };
    });
    return { cgpa: grandCredits > 0 ? (grandPoints / grandCredits) : 0, totalCredits: grandCredits, semesters: semList };
  }, [semesters, currentGPA, totalCreditsDone]);

  const targetCalculations = useMemo(() => {
    const tGpa = parseFloat(targetGPA);
    if (!tGpa || isNaN(tGpa)) return null;

    const pendingSubjects = [];
    semesters.forEach((sem, sIdx) => {
      sem.subjects.forEach((sub, subIdx) => {
        if (!sub.grade || sub.grade === '-') {
          const crs = parseFloat(sub.creditHours);
          if (crs > 0) pendingSubjects.push({ sIdx, subIdx, crs, name: sub.title || `Subject ${subIdx+1}` });
        }
      });
    });

    const pendingCredits = pendingSubjects.reduce((sum, s) => sum + s.crs, 0);
    if (pendingCredits === 0) return { error: 'Add upcoming subjects with "-" grade to see recommendations!' };

    const currentPts = stats.cgpa * stats.totalCredits;
    const finalCredits = stats.totalCredits + pendingCredits;
    const requiredPts = (tGpa * finalCredits) - currentPts;
    const requiredGpa = requiredPts / pendingCredits;

    if (requiredGpa > 4.0) return { error: 'Mathematically impossible! You need > 4.0 average.' };
    if (requiredGpa < 2.0) return { error: `Easy! You just need a ${requiredGpa.toFixed(2)} average.` };

    const gradeScale = [
      { letter: 'A', points: 4.0 }, { letter: 'A-', points: 3.67 },
      { letter: 'B+', points: 3.33 }, { letter: 'B', points: 3.0 },
      { letter: 'B-', points: 2.67 }, { letter: 'C+', points: 2.33 },
      { letter: 'C', points: 2.0 }
    ];

    const recommendations = pendingSubjects.map(sub => {
      let suggested = gradeScale[0];
      for (const g of gradeScale) {
        if (g.points >= requiredGpa) suggested = g;
      }
      return { ...sub, suggestedGrade: suggested.letter };
    });

    return { requiredGpa, pendingCredits, recommendations };
  }, [targetGPA, semesters, stats]);

  const gradeDistribution = useMemo(() => {
    const dist = {};
    semesters.forEach(s => s.subjects.forEach(sub => {
      const g = sub.grade;
      if (g && g !== 'F') {
        const baseG = g[0];
        dist[baseG] = (dist[baseG] || 0) + 1;
      }
    }));
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [semesters]);
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e'];

  const trendData = useMemo(() => stats.semesters.map((s, i) => ({ name: `Sem ${i+1}`, gpa: parseFloat(s.gpa) })), [stats]);

  const generateShareLink = () => {
    try {
      const enc = btoa(JSON.stringify(semesters));
      const url = `${window.location.origin}${window.location.pathname}?data=${enc}`;
      navigator.clipboard.writeText(url);
      alert('Read-only Sandbox link copied to clipboard!');
    } catch(e) {
      alert('Failed to generate link.');
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('UOL Academic Record (Pro)', 14, 22);
    
    doc.setFontSize(12);
    if (profile.name) doc.text(`Name: ${profile.name}`, 14, 32);
    if (profile.rollNo) doc.text(`Registration ID: ${profile.rollNo}`, 14, 38);
    if (profile.program) doc.text(`Program: ${profile.program}`, 14, 44);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 110, 32);
    doc.text(`Cumulative GPA: ${stats.cgpa.toFixed(2)}`, 110, 38);
    doc.text(`Total Credits: ${stats.totalCredits}`, 110, 44);

    const tableData = [];
    semesters.forEach((sem, i) => {
      tableData.push([{ content: `Semester ${i + 1} (GPA: ${stats.semesters[i].gpa})`, colSpan: 3, styles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' } }]);
      sem.subjects.forEach(sub => {
        tableData.push([sub.title || 'Untitled', sub.grade || '-', sub.creditHours || '0']);
      });
    });

    autoTable(doc, {
      startY: 50,
      head: [['Subject', 'Grade', 'Credits']],
      body: tableData,
      theme: 'striped'
    });

    doc.save(`UOL_Result_${userId}.pdf`);
  };

  const dashOffset = useMemo(() => {
    const radius = 70, circumference = 2 * Math.PI * radius;
    return circumference - ((stats.cgpa / 4) * circumference);
  }, [stats.cgpa]);


  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', content: 'Hi! I am your AI Academic Advisor. Ask me anything about your GPA, study tips, or the UOL grading system.' }]);
  const [inputMsg, setInputMsg] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Auto-scroll to bottom of chat
  const messagesEndRef = React.useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!inputMsg.trim()) return;
    const newMsgs = [...messages, { role: 'user', content: inputMsg }];
    setMessages(newMsgs);
    setInputMsg('');
    setIsAiLoading(true);

    setMessages([...newMsgs, { role: 'ai', content: "AI Advisor is currently offline. Please use the app in offline mode." }]);
    setIsAiLoading(false);
  };

  return (
    <div className="container">
      {/* Floating Chat Button */}
      <button className="chat-btn-float" onClick={() => setShowChat(true)}>
        <MessageCircle size={30} />
      </button>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowChat(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="chat-modal-content" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>AI Advisor</span>
                </div>
                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role}`}>
                    {msg.content}
                  </div>
                ))}
                {isAiLoading && <div className="chat-bubble ai" style={{ fontStyle: 'italic', opacity: 0.7 }}>Thinking...</div>}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="chat-input-area" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
                <input
                  className="chat-input"
                  placeholder="Ask about grades, GPA tips..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                />
                <button type="submit" className="chat-send-btn" disabled={isAiLoading || !inputMsg.trim()}>
                  <Send size={20} />
                </button>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="top-banner">Join the Uol forum at <a href="https://forum.uolpro.com" target="_blank">forum.uolpro.com</a></div>
      
      {isSandbox && (
        <div style={{ background: '#f59e0b', color: '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold', borderRadius: '12px', marginBottom: '15px' }}>
          SANDBOX MODE ACTIVE: Changes will not be saved to your profile. (Turn off to save)
        </div>
      )}

      {/* Main Content Area - strict check so it's not visible when logged out */}
      {!user ? (
        <React.Fragment>
          <div className="main-content" style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '100px' }}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              <GraduationCap size={100} style={{ margin: '0 auto', color: 'var(--primary)', marginBottom: '20px' }} />
              <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '15px' }}>UOL CGPA Pro</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
                Accurately calculate, securely track, and professionally download your complete academic history.
              </p>
              
              <button 
                onClick={() => setShowAuthModal(true)} 
                className="btn-action" 
                style={{ fontSize: '1.3rem', padding: '15px 50px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}
              >
                Login to Begin
              </button>
            </motion.div>
          </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Analytics Card */}
            <div className="main-card" style={{ padding: '20px' }}>
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: '0 0 10px 0' }}>Grade Analytics</h3>
              <div style={{ display: 'flex', height: '150px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={gradeDistribution} innerRadius={30} outerRadius={50} paddingAngle={5} dataKey="value">
                        {gradeDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={trendData}>
                      <XAxis dataKey="name" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="gpa" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Target Planner Card */}
            <div className="main-card" style={{ padding: '20px' }}>
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: '0 0 10px 0' }}>Grade Recommender</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Leave grades as "-" on upcoming subjects, then enter your dream CGPA here!</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="number" placeholder="Enter Target CGPA (e.g. 3.5)" value={targetGPA} onChange={e => setTargetGPA(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
              </div>
              {targetCalculations && targetCalculations.error && (
                <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '8px', textAlign: 'center', color: '#f43f5e', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {targetCalculations.error}
                </div>
              )}
              {targetCalculations && !targetCalculations.error && (
                <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '10px', fontSize: '0.95rem' }}>
                    Required Average: {targetCalculations.requiredGpa.toFixed(2)} GPA across {targetCalculations.pendingCredits} upcoming credits
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                    {targetCalculations.recommendations.map((rec, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{rec.name} ({rec.crs} Cr)</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Need: {rec.suggestedGrade}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Top Ad Slot Placeholder */}
          <div style={{
            margin: '10px 0',
            padding: '15px',
            background: 'rgba(5, 150, 105, 0.05)',
            border: '1px dashed var(--primary)',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            color: 'var(--primary)',
            textTransform: 'uppercase'
          }}>
            SPONSORED AD SLOT (Google AdSense)
          </div>

          <div className="main-card">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h2 className="section-title" style={{ margin: 0 }}>UOL Pro</h2>
                {installPrompt && (
                  <button onClick={handleInstall} className="badge-vibe" style={{ marginTop: '5px', border: 'none', cursor: 'pointer' }}>INSTALL APP</button>
                )}
              </div>
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                {user ? (
                  <button onClick={() => {
                    auth.signOut();
                  }} style={{ border: '1px solid #f43f5e', background: 'none', cursor: 'pointer', color: '#f43f5e', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Logout {user.email.split('@')[0]}
                  </button>
                ) : (
                  <button onClick={() => setShowAuthModal(true)} style={{ border: 'none', background: 'var(--primary)', cursor: 'pointer', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Login
                  </button>
                )}
                <button onClick={downloadPDF} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Download PDF">
                  <Download size={20} />
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button onClick={resetData} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#f43f5e' }}>
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            {/* PRO/Monetization Support Section */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(217, 119, 6, 0.1),rgba(217, 119, 6, 0.05))',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(217, 119, 6, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--secondary)' }}>Support Developer</p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Help us keep this tool free & fast!</p>
              </div>
              <button style={{
                background: 'var(--secondary)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                DONATE ☕
              </button>
            </div>
            <div className="mb-8">
              <h3 className="text-sm font-bold opacity-60 uppercase mb-3 text-slate-900 dark:text-slate-100">Current GPA (Optional)</h3>
              <div className="flex gap-1">
                <input type="number" step="0.01" placeholder="Current GPA" value={currentGPA} onChange={(e) => setCurrentGPA(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px 0 0 8px', padding: '10px' }} />
                <input type="number" placeholder="Total Credits" value={totalCreditsDone} onChange={(e) => setTotalCreditsDone(e.target.value)} style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '0 8px 8px 0', borderLeft: 'none', padding: '10px' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>☁️ Offline Mode</span>
                <span>User: {user ? user.email.split('@')[0] : 'Guest'}</span>
              </div>
            </div>
            <AnimatePresence>
              {semesters.map((sem, idx) => (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={sem.id} className="semester-block">
                  <div className="semester-header">
                    <span className="semester-title">Semester {idx + 1}</span>
                    <button onClick={() => removeSemester(sem.id)} className="btn-remove-course" style={{ top: 0, right: 0, transform: 'none', position: 'relative' }}><X size={14} /></button>
                  </div>
                  {sem.subjects.map(sub => (
                    <div key={sub.id} className="course-row">
                      <input className="subject-input" placeholder="Subject Name" value={sub.title} onChange={(e) => updateSubject(sem.id, sub.id, 'title', e.target.value)} />
                      <div className="course-meta">
                        <select
                          value={sub.grade}
                          onChange={(e) => updateSubject(sem.id, sub.id, 'grade', e.target.value)}
                          className="grade-select"
                          style={{
                            color: sub.grade === 'F' ? '#ef4444' : (GRADE_POINTS[sub.grade] >= 3.5 ? '#10b981' : 'var(--primary)')
                          }}
                        >
                          <option value="">Grade</option>
                          {Object.keys(GRADE_POINTS).map(g => (
                            <option key={g} value={g} style={{ color: 'var(--text-main)', background: 'var(--card-bg)' }}>
                              {g} ({GRADE_POINTS[g].toFixed(2)})
                            </option>
                          ))}
                        </select>
                        <input type="number" placeholder="Credits" value={sub.creditHours} onChange={(e) => updateSubject(sem.id, sub.id, 'creditHours', e.target.value)} />
                      </div>
                      <button className="btn-remove-course" onClick={() => removeSubject(sem.id, sub.id)}><X size={14} /></button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-4">
                    <div className="gpa-badge">Semester {idx + 1} GPA: <span>{stats.semesters[idx].gpa}</span></div>
                    <button className="btn-action" style={{ width: 'auto', margin: 0, padding: '6px 14px' }} onClick={() => addSubject(sem.id)}><Plus size={16} /> Add Course</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button className="btn-action" onClick={addSemester}><PlusCircle size={18} /> Add Semester</button>
            {/* Educational Content Area (Crucial for AdSense Approval) */}
            <div style={{ marginTop: '40px', padding: '20px', background: 'var(--card-bg)', borderRadius: '1.5rem', border: '1px solid var(--border)' }}>
              <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '10px' }}>UOL Grading System Explained</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                The University of Lahore (UOL) follows a specific credit-hour weighted GPA system.
                Students must maintain a CGPA of 2.0 or above to stay off probation. Our calculator uses the latest
                UOL 4.0 scale with 0.25/0.50 increments (A, A-, B+, B, B-, C+, C, C-, D+, D, F) to ensure 100% precision
                matching your official transcript.
              </p>
            </div>

            <footer style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '10px' }}>
                <span onClick={() => setShowPrivacy(true)}>Privacy Policy</span>
                <span onClick={() => setShowAbout(true)}>About Us</span>
                <span onClick={() => setShowContact(true)}>Contact</span>
              </div>
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>© 2026 UOL Pro Calculator. Not affiliated with official UOL administration.</p>
            </footer>
          </div>
        </React.Fragment>
      )}

      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAuthModal(false)}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
              <h3 className="section-title" style={{ margin: 0 }}>{isLoginView ? 'Login' : 'Create Account'}</h3>
              <p style={{ marginTop: '5px', marginBottom: '15px' }}>Save your CGPA data to the cloud ☁️</p>

              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />
                <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }} />

                {authError && <p style={{ color: '#f43f5e', fontSize: '0.8rem' }}>{authError}</p>}

                <button type="submit" className="btn-action" style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>
                  {isLoginView ? 'Login' : 'Sign Up'}
                </button>
              </form>

              <p style={{ marginTop: '15px', fontSize: '0.8rem', textAlign: 'center', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }} onClick={() => setIsLoginView(!isLoginView)}>
                {isLoginView ? 'New here? Create Account' : 'Already have an account? Login'}
              </p>
            </motion.div>
          </motion.div>
        )}

        {showPrivacy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowPrivacy(false)}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowPrivacy(false)}><X size={20} /></button>
              <h3 className="section-title" style={{ margin: 0 }}>Privacy Policy</h3>
              <p style={{ marginTop: '15px' }}>Welcome to UOL Pro. Your privacy is critically important to us.</p>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '5px' }}>1. Data Collection</h4>
              <p>We use local storage and a secure cloud backend to save your GPA data for synchronization across your devices. No personal identifying information (PII) is collected.</p>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '5px' }}>2. Cookies & Ads</h4>
              <p>This site uses Google AdSense to serve advertisements. Google may use cookies to serve ads based on your prior visits to this or other websites. You may opt out of personalized advertising by visiting Ad Settings.</p>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '5px' }}>3. Third-Party Links</h4>
              <p>Our app may contain links to external sites (like forum.uolpro.com). We have no control over the content and privacy practices of these sites.</p>

              <button className="btn-action" onClick={() => setShowPrivacy(false)}>I Understand</button>
            </motion.div>
          </motion.div>
        )}
        {showAbout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAbout(false)}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowAbout(false)}><X size={20} /></button>
              <h3 className="section-title" style={{ margin: 0 }}>About UOL Pro</h3>
              <p style={{ marginTop: '15px' }}>UOL Pro is the ultimate academic utility designed specifically for students of <b>The University of Lahore</b>.</p>
              <p>Our mission is to provide an accurate, fast, and user-friendly platform for tracking GPA and CGPA. Built with the latest UOL grading criteria, this tool helps students plan their academic journey with confidence.</p>
              <p>Features include Cloud Sync, PDF Transcript Export, and Dark Mode support.</p>
              <button className="btn-action" onClick={() => setShowAbout(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
        {showContact && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowContact(false)}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowContact(false)}><X size={20} /></button>
              <h3 className="section-title" style={{ margin: 0 }}>Contact Us</h3>
              <p style={{ marginTop: '15px' }}>Have questions or found a bug? We are here to help!</p>
              <div style={{ background: 'var(--bg-color)', padding: '15px', borderRadius: '12px', margin: '15px 0', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--primary)' }}>Email Support:</p>
                <a href="mailto:miansabmi7@gmail.com" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '800' }}>miansabmi7@gmail.com</a>
              </div>
              <p>For community support, join our student forum at forum.uolpro.com</p>
              <button className="btn-action" onClick={() => setShowContact(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="floating-stat" initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <svg className="progress-ring" width="160" height="160">
          <circle stroke="#e2e8f0" strokeWidth="12" fill="transparent" r="70" cx="80" cy="80" />
          <motion.circle stroke="var(--primary)" strokeWidth="12" strokeDasharray={2 * Math.PI * 70} initial={{ strokeDashoffset: 2 * Math.PI * 70 }} animate={{ strokeDashoffset: dashOffset }} strokeLinecap="round" fill="transparent" r="70" cx="80" cy="80" />
        </svg>
        <span className="cgpa-val">{stats.cgpa.toFixed(2)}</span>
        <span className="cgpa-label">Cumulative GPA</span>
        <span style={{ fontSize: '0.6rem', position: 'absolute', bottom: '15px', fontWeight: 'bold', color: '#94a3b8' }}>4.0</span>
      </motion.div>
    </div>
  );
}

export default App;
