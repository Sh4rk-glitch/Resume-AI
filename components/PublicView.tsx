
import React from 'react';
import { ResumeData, AIPersona } from '../types';
import ChatPanel from './ChatPanel';
import PersonaSummary from './PersonaSummary';

interface PublicViewProps {
  resume: ResumeData;
  persona: AIPersona;
  resumeId: string;
  toggleDarkMode: () => void;
  darkMode: boolean;
}

const PublicView: React.FC<PublicViewProps> = ({ resume, persona, resumeId, toggleDarkMode, darkMode }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 h-20 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg">RAI</div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 dark:text-white text-sm">Resume AI</span>
            <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Public Persona</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
          <a 
            href="/"
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            Create Your Own
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-800">
             <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white text-4xl font-black mb-6 shadow-2xl shadow-indigo-500/20">
                  {persona.name.charAt(0)}
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{persona.name}</h1>
                <p className="text-gray-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">{resume.title}</p>
             </div>
             
             <div className="space-y-6">
                <div className="p-5 bg-gray-50 dark:bg-slate-800/40 rounded-3xl border border-gray-100 dark:border-slate-800">
                   <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Professional Tone</h3>
                   <p className="text-sm font-medium text-gray-700 dark:text-slate-300 italic">"{persona.tone}"</p>
                </div>
                
                <div>
                   <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">Core Competencies</h3>
                   <div className="flex flex-wrap gap-2">
                      {persona.strengths.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-tighter">
                          {s}
                        </span>
                      ))}
                   </div>
                </div>
             </div>
          </div>
          
          <div className="hidden lg:block">
             <PersonaSummary resume={resume} persona={persona} />
          </div>
        </div>

        {/* Interaction Hub */}
        <div className="lg:col-span-8 h-[calc(100vh-160px)] flex flex-col">
          <ChatPanel resume={resume} persona={persona} resumeId={resumeId} />
          
          {/* Mobile Summary fallback */}
          <div className="lg:hidden mt-8">
            <PersonaSummary resume={resume} persona={persona} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicView;
