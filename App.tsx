
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ResumeData, AIPersona } from './types';
import Landing from './components/Landing';
import ResumeUpload from './components/ResumeUpload';
import Dashboard from './components/Dashboard';
import PublicView from './components/publicview';
import Auth from './components/Auth';
import { supabase, getUserResumes, saveResume, getResumeByIdentifier } from './services/supabase';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [currentPersona, setCurrentPersona] = useState<AIPersona | null>(null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleInitialRoute = async () => {
      const path = window.location.pathname.split('/').filter(Boolean)[0];
      
      // Reserved paths for internal app states
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
          await fetchUserHistory(currentSession.user.id);
        } else {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        if (appState !== AppState.PUBLIC_VIEW) {
          fetchUserHistory(newSession.user.id);
        }
      } else {
        if (appState !== AppState.PUBLIC_VIEW) {
          setAppState(AppState.LANDING);
          setSavedResumes([]);
          setCurrentResume(null);
          setCurrentPersona(null);
          setCurrentResumeId(null);
        }
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [appState]);

  const fetchUserHistory = async (userId: string) => {
    try {
      const resumes = await getUserResumes(userId);
      setSavedResumes(resumes || []);
      if (resumes && resumes.length > 0) {
        setCurrentResume(resumes[0].resume_data);
        setCurrentPersona(resumes[0].persona_data);
        setCurrentResumeId(resumes[0].id);
        setAppState(prev => (prev === AppState.AUTH || prev === AppState.UPLOADING) ? AppState.DASHBOARD : prev);
      } else {
        setAppState(prev => prev === AppState.AUTH ? AppState.UPLOADING : prev);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStart = () => {
    if (session) {
      if (savedResumes.length > 0) {
        setAppState(AppState.DASHBOARD);
      } else {
        setAppState(AppState.UPLOADING);
      }
    } else {
      setAppState(AppState.AUTH);
    }
  };

  const handleSignIn = () => {
    if (session) {
      setAppState(AppState.DASHBOARD);
    } else {
      setAppState(AppState.AUTH);
    }
  };

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
    } catch (err) {
      console.error('Error saving resume:', err);
      setCurrentResume(data.resume);
      setCurrentPersona(data.persona);
      setAppState(AppState.DASHBOARD);
    }
  }, [session]);

  const selectPersona = (index: number) => {
    const selected = savedResumes[index];
    setCurrentResume(selected.resume_data);
    setCurrentPersona(selected.persona_data);
    setCurrentResumeId(selected.id);
  };

  const handleReset = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-2xl animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] animate-pulse">Neural Path Resolving...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-all duration-500 ease-in-out dark:bg-slate-950 dark:text-slate-100">
      {appState === AppState.LANDING && (
        <Landing 
          onStart={handleStart} 
          onSignIn={handleSignIn}
          isLoggedIn={!!session}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
      )}
      
      {appState === AppState.AUTH && (
        <Auth onSuccess={() => {}} onBack={() => setAppState(AppState.LANDING)} />
      )}

      {appState === AppState.UPLOADING && (
        <ResumeUpload onComplete={handleDataParsed} onBack={() => setAppState(AppState.LANDING)} />
      )}

      {appState === AppState.PUBLIC_VIEW && currentResume && currentPersona && currentResumeId && (
        <PublicView
          resume={currentResume}
          persona={currentPersona}
          resumeId={currentResumeId}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
      )}

      {appState === AppState.DASHBOARD && currentResume && currentPersona && (
        <Dashboard 
          resume={currentResume} 
          persona={currentPersona} 
          savedResumes={savedResumes}
          onSelectPersona={selectPersona}
          onNewResume={() => setAppState(AppState.UPLOADING)}
          onReset={handleReset}
          onHome={() => setAppState(AppState.LANDING)}
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default App;
