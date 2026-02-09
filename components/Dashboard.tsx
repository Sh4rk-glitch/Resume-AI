import React, { useState } from 'react';
import { ResumeData, AIPersona } from '../types';
import ChatPanel from './ChatPanel';
import PersonaSummary from './PersonaSummary';

interface DashboardProps {
  resume: ResumeData;
  persona: AIPersona;
  savedResumes: any[];
  onSelectPersona: (index: number) => void;
  onNewResume: () => void;
  onReset: () => void;
  onHome: () => void;
  toggleDarkMode: () => void;
  darkMode: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  resume, 
  persona, 
  savedResumes, 
  onSelectPersona, 
  onNewResume,
  onReset, 
  onHome,
  toggleDarkMode, 
  darkMode,
  showToast,
  showConfirm
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>('chat');
  const [showHistory, setShowHistory] = useState(false);
  
  const host = window.location.host;
  const vanityDomain = "resume-ai.app";
  const publicPath = `/${persona.identifier}`;
  
  // The actual URL for functional use (copying/opening)
  const actualPublicUrl = `${window.location.protocol}//${host}${publicPath}`;
  // The pretty URL for display branding
  const displayPublicUrl = `${vanityDomain}${publicPath}`;

  const currentResumeEntry = savedResumes.find(r => r.persona_data.identifier === persona.identifier);
  const resumeId = currentResumeEntry?.id;

  const copyLink = () => {
    navigator.clipboard.writeText(actualPublicUrl);
    showToast('Public persona link copied!');
  };

  const openPublicView = () => {
    window.open(publicPath, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-target group" onClick={onHome}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">RAI</div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block tracking-tight">Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.2em]">{displayPublicUrl}</span>
            </div>
            
            <button 
              onClick={copyLink}
              className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-target shadow-sm active:scale-95"
              title="Copy public link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>

            <button 
              onClick={openPublicView}
              className="hidden sm:flex items-center px-6 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 cursor-target active:scale-95"
            >
              View Public Page
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-3 rounded-2xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-target"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>

            <button 
              onClick={() => showConfirm('Logout', 'Are you sure you want to end your session?', onReset)}
              className="px-5 py-3 bg-red-50 dark:bg-red-900/10 text-[10px] font-black text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-colors uppercase tracking-widest cursor-target"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        <div className="lg:col-span-4 space-y-6 overflow-y-auto custom-scrollbar pr-1">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-gray-100 dark:border-slate-800 cursor-target relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="flex items-center space-x-6 mb-10 relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-500/30">
                {persona.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight truncate tracking-tight">{persona.name}</h2>
                <div className="flex items-center mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">Neural Link 1.0</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8 relative z-10">
              <div>
                <h3 className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">Core Persona Tone</h3>
                <p className="text-gray-700 dark:text-slate-300 text-sm font-medium leading-relaxed bg-gray-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-inner italic">
                  "{persona.tone}"
                </p>
              </div>
              <div>
                <h3 className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4">High Fidelity Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {persona.strengths.slice(0, 6).map((s, i) => (
                    <span key={i} className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-black rounded-xl border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-tighter cursor-target hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-6 px-2">Navigation</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('chat')} 
                className={`w-full text-left p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center cursor-target ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-800'}`}
              >
                <span className="mr-4 text-xl">💬</span>
                Interactive Chat
              </button>
              <button 
                onClick={() => setActiveTab('summary')} 
                className={`w-full text-left p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center cursor-target ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-800'}`}
              >
                <span className="mr-4 text-xl">📄</span>
                Context Analysis
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`w-full text-left p-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center cursor-target ${showHistory ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-800'}`}
              >
                <span className="mr-4 text-xl">🗄️</span>
                Persona Registry
              </button>
            </div>

            {showHistory && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 space-y-2 max-h-64 overflow-y-auto custom-scrollbar animate-fade-in">
                {savedResumes.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectPersona(idx)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border cursor-target ${item.persona_data.identifier === persona.identifier ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight mb-1">{item.persona_data.name}</div>
                    <div className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
                <button 
                  onClick={onNewResume}
                  className="w-full mt-4 p-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-target"
                >
                  + Evolve New Persona
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 h-[calc(100vh-160px)] flex flex-col">
          {activeTab === 'chat' ? (
            <ChatPanel 
              resume={resume} 
              persona={persona} 
              resumeId={resumeId} 
              showToast={showToast}
              showConfirm={showConfirm}
            />
          ) : (
            <PersonaSummary resume={resume} persona={persona} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;