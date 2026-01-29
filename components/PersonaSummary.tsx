
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
      {/* Bio / Description */}
      <section>
        <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-3"></span>
          Persona Directive
        </h2>
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl p-8 text-indigo-900 dark:text-indigo-300 leading-relaxed italic text-lg shadow-inner">
          "{renderContent(persona.description)}"
        </div>
      </section>

      {/* Experience Timeline */}
      <section>
        <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-8 flex items-center">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-3"></span>
          Chronological Record
        </h2>
        <div className="space-y-10 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-gray-200 dark:before:bg-slate-800">
          {resume.experience.map((exp, i) => (
            <div key={i} className="relative pl-12 group">
              <div className="absolute left-0 top-1.5 w-8 h-8 bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-xl z-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="flex flex-col md:flex-row md:justify-between mb-4">
                  <h3 className="font-black text-xl text-gray-900 dark:text-white">{exp.role}</h3>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">{exp.duration}</span>
                </div>
                <div className="text-sm font-bold text-gray-400 dark:text-slate-500 mb-4">{exp.company}</div>
                <ul className="space-y-3">
                  {exp.description.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-600 dark:text-slate-400 flex items-start">
                      <span className="inline-block w-1 h-1 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      {renderContent(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Radar Area */}
      <section>
        <h2 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-3"></span>
          Skill Nodes
        </h2>
        <div className="flex flex-wrap gap-3">
          {resume.skills.map((skill, i) => (
            <span key={i} className="px-5 py-2.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:border-indigo-500 transition-all cursor-default">
              {skill}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PersonaSummary;
