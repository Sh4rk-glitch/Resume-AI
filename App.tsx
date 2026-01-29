
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ResumeData, AIPersona } from './types';
import Landing from './components/Landing';
import ResumeUpload from './components/ResumeUpload';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { supabase, getUserResumes, saveResume } from './services/supabase';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [currentPersona, setCurrentPersona] = useState<AIPersona | null>(null);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserHistory(session.user.id);
      } else {
        setIsInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserHistory(session.user.id);
      } else {
        setAppState(AppState.LANDING);
        setSavedResumes([]);
        setCurrentResume(null);
        setCurrentPersona(null);
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserHistory = async (userId: string) => {
    try {
      const resumes = await getUserResumes(userId);
      setSavedResumes(resumes || []);
      if (resumes && resumes.length > 0) {
        setCurrentResume(resumes[0].resume_data);
        setCurrentPersona(resumes[0].persona_data);
        // We stay in LANDING initially if they just refreshed, or we go to DASHBOARD if they were in AUTH
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
  };

  const handleReset = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
