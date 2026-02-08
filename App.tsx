
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ResumeData, AIPersona } from './types';
import Landing from './components/Landing';
import ResumeUpload from './components/ResumeUpload';
import Dashboard from './components/Dashboard';
import PublicView from './components/publicview_temp';
import Auth from './components/Auth';
import TargetCursor from './components/TargetCursor';
import NotificationContainer from './components/NotificationContainer';
import { supabase, getUserResumes, saveResume, getResumeByIdentifier } from './services/supabase';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [currentPersona, setCurrentPersona] = useState<AIPersona | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [hasApiKey, setHasApiKey] = useState(false);
  const [canUseBridge, setCanUseBridge] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  }, []);

  // Proactive Key Detection
  useEffect(() => {
    const checkKeyStatus = async () => {
      const globalKey = process.env.API_KEY;
      const bridge = (window as any).aistudio;
      
      setCanUseBridge(!!bridge);

      // A key is valid if it's a real string (not the placeholder 'process.env.API_KEY')
      const envKeyExists = globalKey && 
                           globalKey.length > 10 && 
                           globalKey !== 'process.env.API_KEY' && 
                           globalKey !== 'undefined';

      if (envKeyExists) {
        setHasApiKey(true);
      } else if (bridge) {
        try {
          const selected = await bridge.hasSelectedApiKey();
          setHasApiKey(selected);
        } catch (e) {
          setHasApiKey(false);
        }
      } else {
        setHasApiKey(false);
      }
    };

    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKeyPicker = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setHasApiKey(true);
        showToast("Neural link established. System operational.");
      } catch (err) {
        showToast("Key selection required for AI features.", "info");
      }
    } else {
      showToast("Neural Bridge not detected. Check browser compatibility.", "error");
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const fetchUserHistory = useCallback(async (userId: string, shouldRoute: boolean = false) => {
    try {
      const resumes = await getUserResumes(userId);
      setSavedResumes(resumes || []);
      
      if (resumes && resumes.length > 0) {
        setCurrentResume(resumes[0].resume_data);
        setCurrentPersona(resumes[0].persona_data);
        setCurrentResumeId(resumes[0].id);
        if (shouldRoute) setAppState(AppState.DASHBOARD);
      } else if (shouldRoute) {
        setAppState(AppState.UPLOADING);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const handleInitialRoute = async () => {
      const path = window.location.pathname.split('/').filter(Boolean)[0];
      const reservedPaths = ['dashboard', 'auth', 'upload', 'callback'];
      
      if (path && !reservedPaths.includes(path.toLowerCase())) {
        try {
          const publicResume = await getResumeByIdentifier(path);
          if (publicResume) {
            setCurrentResume(publicResume.resume_data);
            setCurrentPersona(publicResume.persona_data);
            setCurrentResumeId(publicResume.id);
            setAppState(AppState.PUBLIC_VIEW);
            setIsInitializing(false);
            return true;
          }
        } catch (error) {
          console.error("Route resolution failed:", error);
        }
      }
      return false;
    };

    const initializeAuth = async () => {
      try {
        const isPublicRoute = await handleInitialRoute();
        if (isPublicRoute) return;

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession) {
          await fetchUserHistory(currentSession.user.id, true);
        } else {
          setIsInitializing(false);
        }
      } catch (err) {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const isEntryEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        if (isEntryEvent) fetchUserHistory(newSession.user.id, true);
      } else {
        setAppState(current => (current === AppState.DASHBOARD || current === AppState.UPLOADING) ? AppState.LANDING : current);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserHistory]);

  const handleStart = () => {
    if (!hasApiKey && canUseBridge) {
      handleOpenKeyPicker();
      return;
    }
    if (session) {
      setAppState(savedResumes.length > 0 ? AppState.DASHBOARD : AppState.UPLOADING);
    } else {
      setAppState(AppState.AUTH);
    }
  };

  const handleSignIn = () => setAppState(session ? AppState.DASHBOARD : AppState.AUTH);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleDataParsed = useCallback(async (data: { resume: ResumeData; persona: AIPersona }) => {
    if (!session?.user?.id) return;
    try {
      const saved = await saveResume(session.user.id, data.resume, data.persona);
      setSavedResumes(prev => [saved, ...prev]);
      setCurrentResume(data.resume);
      setCurrentPersona(data.persona);
      setCurrentResumeId(saved.id);
      setAppState(AppState.DASHBOARD);
      showToast("Persona synthesized successfully!");
    } catch (err) {
      setCurrentResume(data.resume);
      setCurrentPersona(data.persona);
      setAppState(AppState.DASHBOARD);
      showToast("Persona synthesized with offline fallback.", "info");
    }
  }, [session, showToast]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-2xl animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] animate-pulse">Neural Path Resolving...</p>
      </div>
    );
  }

  const isPublicDomain = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('resume-ai.app');

  return (
    <div className="min-h-screen transition-all duration-500 ease-in-out dark:bg-slate-950 dark:text-slate-100">
      <TargetCursor appState={appState} hideDefaultCursor={true} />

      {/* Global Status Bar for Keys */}
      <div className="fixed top-6 right-6 z-[100] flex items-center space-x-3 pointer-events-none">
        <div className={`px-4 py-2 rounded-full border backdrop-blur-md flex items-center space-x-2 transition-all duration-500 ${hasApiKey ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse'}`}>
          <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500 animate-ping'}`}></div>
          <span className="text-[9px] font-black uppercase tracking-widest">{hasApiKey ? 'Neural Link Active' : 'Neural Link Offline'}</span>
        </div>
      </div>

      {!hasApiKey && appState !== AppState.LANDING && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up w-full max-w-sm px-4">
           {canUseBridge ? (
             <div className="bg-white dark:bg-slate-900 border border-indigo-500/20 shadow-2xl rounded-[2.5rem] p-8 text-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                   <span className="text-2xl animate-pulse">⚡</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Connect AI Engine</h3>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Browser-based apps cannot access private Vercel variables. Please use the Neural Bridge to connect your key.
                </p>
                <button 
                  onClick={handleOpenKeyPicker}
                  className="w-full py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all cursor-target"
                >
                  Establish Neural Bridge
                </button>
                <div className="mt-4 flex flex-col items-center space-y-1">
                   <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-indigo-500 uppercase hover:underline cursor-target">Billing Requirements</a>
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Selected keys are saved in this browser</p>
                </div>
             </div>
           ) : isPublicDomain ? (
             <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-4 text-center">
                <p className="text-red-500 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                  System Offline: Browser blocked from accessing API_KEY.<br/>
                  Ensure you are using a compatible modern browser.
                </p>
             </div>
           ) : null}
        </div>
      )}

      <NotificationContainer toast={notification} confirm={confirmDialog} onCloseConfirm={() => setConfirmDialog(null)} />
      
      {appState === AppState.LANDING && (
        <Landing onStart={handleStart} onSignIn={handleSignIn} isLoggedIn={!!session} toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
      )}
      
      {appState === AppState.AUTH && (
        <Auth onSuccess={() => {}} onBack={() => setAppState(AppState.LANDING)} />
      )}

      {appState === AppState.UPLOADING && (
        <ResumeUpload onComplete={handleDataParsed} onBack={() => setAppState(AppState.LANDING)} />
      )}

      {appState === AppState.PUBLIC_VIEW && currentResume && currentPersona && currentResumeId && (
        <PublicView resume={currentResume} persona={currentPersona} resumeId={currentResumeId} toggleDarkMode={toggleDarkMode} darkMode={darkMode} showToast={showToast} showConfirm={showConfirm} />
      )}

      {appState === AppState.DASHBOARD && currentResume && currentPersona && (
        <Dashboard 
          resume={currentResume} persona={currentPersona} savedResumes={savedResumes}
          onSelectPersona={(i) => {
            const s = savedResumes[i];
            setCurrentResume(s.resume_data); setCurrentPersona(s.persona_data); setCurrentResumeId(s.id);
          }}
          onNewResume={() => setAppState(AppState.UPLOADING)}
          onReset={async () => await supabase.auth.signOut()}
          onHome={() => setAppState(AppState.LANDING)}
          toggleDarkMode={toggleDarkMode} darkMode={darkMode} showToast={showToast} showConfirm={showConfirm}
        />
      )}
    </div>
  );
};

export default App;
