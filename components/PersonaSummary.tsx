
import React from 'react';
import { ResumeData, AIPersona } from '../types';

interface PersonaSummaryProps {
  resume: ResumeData;
  persona: AIPersona;
}

const PersonaSummary: React.FC<PersonaSummaryProps> = ({ resume, persona }) => {
  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 flex-1 overflow-y-auto p-8 md:p-12 space-y-16 custom-scrollbar">
      
      {/* Persona Directive */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-2 bg-indigo-500 rounded-sm rotate-45" />
          <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">
            Persona Directive
          </h2>
          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
          <div className="relative bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/30 rounded-[2rem] p-8 md:p-10 text-indigo-950 dark:text-indigo-200 leading-relaxed italic text-xl shadow-inner overflow-hidden">
             <span className="absolute top-4 left-6 text-6xl text-indigo-500/10 font-serif leading-none">“</span>
             <div className="relative z-10">{renderContent(persona.description)}</div>
          </div>
        </div>
      </section>

      {/* Chronological Record */}
      <section>
        <div className="flex items-center gap-4 mb-10">
          <div className="w-2 h-2 bg-indigo-500 rounded-sm rotate-45" />
          <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">
            Chronological Record
          </h2>
          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800" />
        </div>

        <div className="space-y-12 relative before:absolute before:inset-y-0 before:left-5 before:w-[2px] before:bg-gradient-to-b before:from-indigo-500/50 before:via-indigo-500/10 before:to-transparent">
          {resume.experience.map((exp, i) => (
            <div key={i} className="relative pl-14 group">
              {/* Timeline Marker */}
              <div className="absolute left-0 top-2 w-10 h-10 bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-2xl z-10 flex items-center justify-center group-hover:border-indigo-500 group-hover:scale-110 transition-all shadow-lg">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:animate-ping" />
              </div>

              {/* Card */}
              <div className="bg-gray-50/50 dark:bg-slate-800/20 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-800/50 group-hover:border-indigo-500/20 group-hover:bg-white dark:group-hover:bg-slate-800/40 transition-all">
                <div className="mb-6">
                  <span className="inline-block font-mono text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-3 bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">
                    {exp.duration}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                    {exp.role}
                  </h3>
                  <p className="text-sm font-mono font-bold text-gray-400 dark:text-slate-500 mt-2 uppercase tracking-widest">
                    {exp.company}
                  </p>
                </div>

                <ul className="space-y-4">
                  {exp.description.map((item, idx) => (
                    <li key={idx} className="text-sm md:text-base text-gray-600 dark:text-slate-400 flex items-start leading-relaxed">
                      <span className="inline-block w-1.5 h-1.5 bg-indigo-400/30 rounded-full mt-2 mr-4 flex-shrink-0 group-hover:bg-indigo-500/50 transition-colors" />
                      <div className="flex-1">{renderContent(item)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Nodes */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-2 bg-indigo-500 rounded-sm rotate-45" />
          <h2 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.4em]">
            Skill Nodes
          </h2>
          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="flex flex-wrap gap-3">
          {resume.skills.map((skill, i) => (
            <div 
              key={i} 
              className="px-5 py-3 bg-white dark:bg-slate-800/50 text-gray-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-default"
            >
              {skill}
            </div>
          ))}
        </div>
      </section>

      {/* Data Source Footer */}
      <div className="pt-8 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center opacity-30">
        <span className="text-[9px] font-mono tracking-widest uppercase">Registry_V2</span>
        <span className="text-[9px] font-mono tracking-widest uppercase">Verified_Link</span>
      </div>
    </div>
  );
};

export default PersonaSummary;
