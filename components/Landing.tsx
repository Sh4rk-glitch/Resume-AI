
import React, { useEffect, useRef, useState } from 'react';

interface LandingProps {
  onStart: () => void;
  onSignIn: () => void;
  isLoggedIn: boolean;
  toggleDarkMode: () => void;
  darkMode: boolean;
}

const Landing: React.FC<LandingProps> = ({ onStart, onSignIn, isLoggedIn, toggleDarkMode, darkMode }) => {
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const [showPreview, setShowPreview] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const currentRefs = Object.values(sectionRefs.current) as (HTMLElement | null)[];
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current[id] = el;
  };

  const steps = [
    {
      id: 'step1',
      title: 'Upload DNA',
      description: 'Gemini 3 deep-scans your history, identifying hidden strengths.',
      icon: "⚡"
    },
    {
      id: 'step2',
      title: 'Synthesis',
      description: 'Your digital twin learns your tone and professional expertise.',
      icon: "🧬"
    },
    {
      id: 'step3',
      title: 'Deploy',
      description: 'Share resume-ai.app/yourname and let recruiters chat with your legacy.',
      icon: "🌐"
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden dark:bg-slate-950">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 grid-bg opacity-40 dark:opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white dark:from-slate-950 dark:via-transparent dark:to-slate-950"></div>
      </div>

      {/* Navigation Header */}
      <nav className="relative z-50 w-full max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
        <div className="flex items-center space-x-2 group cursor-target" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg group-hover:rotate-12 transition-transform">
            RAI
          </div>
          <span className="text-xl font-bold dark:text-white tracking-tight">Resume AI</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors cursor-target"
          >
            {darkMode ? '🌙' : '☀️'}
          </button>
          <button 
            onClick={onSignIn}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm cursor-target ${
              isLoggedIn 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'dark:text-slate-300 dark:border-slate-800 border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-white dark:hover:bg-slate-800'
            }`}
          >
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-4 pt-32 pb-48">
        <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="inline-flex items-center space-x-2 px-4 py-2 mb-8 text-xs font-bold tracking-widest text-indigo-500 uppercase bg-indigo-500/5 border border-indigo-500/20 rounded-full animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>Powered by Gemini 3.0 Flash</span>
        </div>
        
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter dark:text-white mb-8 animate-fade-in-up leading-[0.9]">
          The Resume <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] animate-gradient italic">
            Autonomous.
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-100">
          We don't just parse files. We synthesize personas. Your professional history becomes a living dialogue on resume-ai.app.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-in-up delay-200">
          <button
            onClick={onStart}
            className="group relative px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] cursor-target"
          >
            Evolve Resume
          </button>
          <button 
            onClick={() => setShowPreview(true)}
            className="px-10 py-5 dark:bg-slate-900 dark:text-white border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all font-bold cursor-target"
          >
            Live Preview
          </button>
        </div>
      </section>

      {/* Feature Bento Grid with Scroll Animation */}
      <section id="features" ref={setRef('features')} className="relative py-32 px-4 bg-slate-50 dark:bg-slate-900/50 border-y border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "🤖", title: "AI Recruiting Agent", desc: "Your persona acts as a first-line interviewer for potential employers.", id: "f1" },
            { icon: "📊", title: "Deep Context", desc: "Understands the 'why' behind your career choices, not just the 'what'.", id: "f2" },
            { icon: "🔗", title: "Custom App Link", desc: "Replace your LinkedIn URL with a high-fidelity AI persona link.", id: "f3" },
            { icon: "🔐", title: "Privacy First", desc: "Full control over who sees your persona and how much it reveals.", id: "f4" }
          ].map((feature, i) => (
            <div 
              key={feature.id}
              className={`glass p-8 rounded-3xl border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-1000 group cursor-target ${
                isVisible['features'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h4 className="font-bold mb-2 dark:text-white">{feature.title}</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section with Scroll Animation */}
      <section id="how-it-works" ref={setRef('how-it-works')} className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black dark:text-white mb-6 tracking-tight">The Synthesis Pipeline</h2>
          <p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">Three steps to professional autonomy.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
          {/* Connector Line (visible on desktop) */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-indigo-500/10 hidden md:block -z-10"></div>
          
          {steps.map((step, i) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center text-center transition-all duration-1000 ${
                isVisible['how-it-works'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${i * 200}ms` }}
            >
              <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl flex items-center justify-center text-3xl shadow-xl mb-8 group hover:scale-110 transition-transform cursor-target">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-4">{step.title}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-[250px]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="final-cta" ref={setRef('final-cta')} className="relative py-64 px-4 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600 -z-10">
          <div className="absolute inset-0 opacity-20 grid-bg"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-600/50 to-indigo-900"></div>
        </div>
        
        <div className={`max-w-4xl text-center transition-all duration-1000 ${
          isVisible['final-cta'] ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          <h2 className="text-6xl md:text-9xl font-black text-white mb-16 tracking-tight leading-none">
            Stop sending documents. <br />
            <span className="opacity-30">Deploy agents.</span>
          </h2>
          <button
            onClick={onStart}
            className="px-16 py-8 bg-white text-indigo-600 font-black text-2xl rounded-3xl hover:bg-gray-100 shadow-[0_20px_60px_-15px_rgba(255,255,255,0.4)] transition-all hover:scale-110 active:scale-95 cursor-target"
          >
            Launch My Persona
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-900 py-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col items-center md:items-start space-y-6">
            <div className="flex items-center space-x-3 cursor-target">
              <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg">RAI</div>
              <span className="font-bold dark:text-white text-2xl">Resume AI</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-500 max-w-xs text-center md:text-left">The next evolution of professional identity. Building a standard for autonomous career representation.</p>
          </div>
        </div>
        <div className="mt-24 text-center text-[10px] text-gray-300 dark:text-slate-800 font-black uppercase tracking-[0.5em]">
          Evolved Professionally © 2025 • resume-ai.app • Built with ♡ by Shourya Mishra
        </div>
      </footer>

      {/* Live Preview Modal */}
      {showPreview && <LivePreview onClose={() => setShowPreview(false)} onStart={onStart} />}
    </div>
  );
};

const LivePreview: React.FC<{ onClose: () => void; onStart: () => void }> = ({ onClose, onStart }) => {
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<{ role: 'recruiter' | 'ai'; text: string }[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      setSyncProgress(prev => (prev + 0.4) % 100);
    }, 50);

    const scriptTimer = setTimeout(() => {
      if (step === 0) {
        setMessages([{ role: 'ai', text: 'Persona initialized. I am **Visionary AI**. How can I help you explore my creator\'s background?' }]);
        setStep(1);
      } else if (step === 1) {
        setMessages(prev => [...prev, { role: 'recruiter', text: 'Tell me about the capital allocation strategy mentioned in your professional record.' }]);
        setStep(2);
      } else if (step === 2) {
        setMessages(prev => [...prev, { role: 'ai', text: 'I approach capital allocation with a mindset of **financial stewardship**. In my previous roles, I aligned multimillion-dollar investments with long-term strategy by focusing on **ROI maximization** and **stakeholder engagement**.' }]);
        setStep(3);
      }
    }, 2000);

    return () => {
      clearTimeout(scriptTimer);
      clearInterval(syncInterval);
    };
  }, [step]);

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-indigo-600 dark:text-indigo-400 font-black">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 animate-fade-in">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row h-[85vh]">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 bg-gray-50 dark:bg-[#080d1a] p-8 border-r border-gray-100 dark:border-slate-800 hidden md:flex flex-col">
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">RAI</div>
            <span className="font-black text-gray-900 dark:text-white text-xs tracking-widest uppercase">Dashboard</span>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="space-y-4">
               <div className="flex items-center space-x-4">
                 <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl">
                   V
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
                 </div>
                 <div>
                   <h4 className="font-black text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Active Persona</h4>
                   <div className="text-xs font-bold text-indigo-500 uppercase tracking-tighter">Visionary AI</div>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest flex justify-between">
                 <span>Tone Signature</span>
                 <span className="text-indigo-500 animate-pulse">Active</span>
               </div>
               <div className="p-4 bg-white dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                 <div className="space-y-2">
                   <div className="h-2 bg-indigo-500/20 rounded-full w-full animate-pulse"></div>
                   <div className="h-2 bg-indigo-500/10 rounded-full w-[80%] animate-pulse delay-75"></div>
                   <div className="h-2 bg-indigo-500/5 rounded-full w-[40%] animate-pulse delay-150"></div>
                 </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest">Skill Modules</div>
               <div className="grid grid-cols-2 gap-2">
                 {['Strategy', 'Cloud', 'FinOps', 'Leadership'].map((skill, i) => (
                   <div key={i} className="px-2 py-1.5 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-lg border border-indigo-500/10 text-[8px] font-black uppercase text-indigo-500 tracking-tighter text-center cursor-target">
                     {skill}
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-gray-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-3 px-1">
                <div className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Neural Sync</div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-slate-600">{Math.floor(syncProgress)}%</div>
             </div>
             <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" 
                  style={{ width: `${syncProgress}%` }}
                ></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-[scan-progress_1.5s_linear_infinite]"></div>
             </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative">
          <div className="h-16 border-b border-gray-100 dark:border-slate-900 px-8 flex items-center justify-between">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3 animate-ping"></span>
              <span className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">Recruiter Session Simulator</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 cursor-target">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-white dark:bg-slate-950">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'recruiter' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-6 rounded-[2rem] text-sm leading-relaxed shadow-sm border animate-fade-in-up cursor-target ${
                  m.role === 'recruiter' 
                    ? 'bg-indigo-600 text-white rounded-br-none border-indigo-500' 
                    : 'bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-slate-200 rounded-bl-none border-gray-200 dark:border-slate-800'
                }`}>
                  <div className="whitespace-pre-wrap">{renderText(m.text)}</div>
                  <div className={`text-[9px] mt-3 font-bold uppercase tracking-widest ${m.role === 'recruiter' ? 'text-indigo-200 text-right' : 'text-gray-400 dark:text-slate-500'}`}>
                     {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {(step === 1 || step === 2) && (
              <div className={`flex ${step === 1 ? 'justify-end' : 'justify-start'}`}>
                <div className={`${step === 1 ? 'bg-indigo-600/10' : 'bg-gray-100 dark:bg-slate-900'} p-4 rounded-2xl animate-pulse`}>
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-gray-100 dark:border-slate-900 bg-gray-50/50 dark:bg-slate-950/50">
            <div className="relative">
              {step < 3 ? (
                <div className="w-full h-14 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex items-center px-6 text-gray-400 dark:text-slate-600 text-xs italic">
                  <span className="flex items-center">
                    <span className="w-1 h-1 bg-indigo-500 rounded-full mr-2 animate-ping"></span>
                    {step === 1 ? 'Recruiter session in progress...' : 'Synthesizing response...'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col space-y-4 animate-fade-in-up">
                  <div className="text-center text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">
                    Simulator Ready. Deploy Your Reality.
                  </div>
                  <button 
                    onClick={onStart} 
                    className="w-full py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-700 transition-all shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] active:scale-[0.98] cursor-target"
                  >
                    Deploy Your Own Persona
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default Landing;
