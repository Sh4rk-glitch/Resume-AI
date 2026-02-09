
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
  const publicPath = `/${persona.identifier}`;
  const fullPublicUrl = `${window.location.protocol}//${host}${publicPath}`;

  const currentResumeEntry = savedResumes.find(r => r.persona_data.identifier === persona.identifier);
  const resumeId = currentResumeEntry?.id;

  const copyLink = () => {
    navigator.clipboard.writeText(fullPublicUrl);
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
            <h1 className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center bg-indigo-50 dark:bg-indigo-900/10 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">{host}{publicPath}</span>
            </div>
            
            <button 
              onClick={copyLink}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-target shadow-sm"
              title="Copy public link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>

            <button 
              onClick={openPublicView}
              className="hidden sm:flex items-center px-4 py-2.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 cursor-target"
            >
              View Public Page
            </button>

            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-target"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>

            <button 
              onClick={() => showConfirm('Logout', 'Are you sure you want to end your session?', onReset)}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-xs font-black text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-colors uppercase tracking-widest cursor-target"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800 cursor-target">
            <div className="flex items-center space-x-6 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/20">
                {persona.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">{persona.name}</h2>
                <div className="flex items-center mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">Neural DNA Linked</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Tone Signature</h3>
                <p className="text-gray-700 dark:text-slate-300 text-sm font-medium bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  {persona.tone}
                </p>
              </div>
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Skill Modules</h3>
                <div className="flex flex-wrap gap-2">
                  {persona.strengths.slice(0, 5).map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-lg border border-indigo-100 dark:border-indigo-900/30 uppercase cursor-target">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Navigation</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('chat')} 
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center cursor-target ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                <span className="mr-3 text-lg">💬</span>
                Interactive Chat
              </button>
              <button 
                onClick={() => setActiveTab('summary')} 
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center cursor-target ${activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                <span className="mr-3 text-lg">📄</span>
                Structure Analysis
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center cursor-target ${showHistory ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
              >
                <span className="mr-3 text-lg">🗄️</span>
                Persona Registry ({savedResumes.length})
              </button>
            </div>

            {showHistory && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {savedResumes.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectPersona(idx)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all border cursor-target ${item.persona_data.identifier === persona.identifier ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="truncate">{item.persona_data.name}</div>
                    <div className="text-[10px] opacity-60 font-medium">{new Date(item.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
                <button 
                  onClick={onNewResume}
                  className="w-full mt-2 p-3 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-target"
                >
                  + Evolve New DNA
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
