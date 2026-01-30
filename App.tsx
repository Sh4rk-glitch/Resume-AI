
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
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  }, []);

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
        if (shouldRoute) {
          setAppState(AppState.DASHBOARD);
        }
      } else {
        if (shouldRoute) {
          setAppState(AppState.UPLOADING);
        }
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
        console.error("Initialization error:", err);
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      
      if (newSession) {
        const isEntryEvent = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        setAppState(current => {
          if (current === AppState.PUBLIC_VIEW) return current;
          if (isEntryEvent) {
            fetchUserHistory(newSession.user.id, true);
          } else {
            fetchUserHistory(newSession.user.id, false);
          }
          return current;
        });
      } else {
        setAppState(current => {
          if (current === AppState.DASHBOARD || current === AppState.UPLOADING) {
            setSavedResumes([]);
            setCurrentResume(null);
            setCurrentPersona(null);
            setCurrentResumeId(null);
            return AppState.LANDING;
          }
          return current;
        });
        setIsInitializing(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserHistory]);

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
      showToast("Persona synthesized successfully!");
    } catch (err) {
      console.error('Error saving resume:', err);
      setCurrentResume(data.resume);
      setCurrentPersona(data.persona);
      setAppState(AppState.DASHBOARD);
      showToast("Persona synthesized with offline fallback.", "info");
    }
  }, [session, showToast]);

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
      <TargetCursor 
        appState={appState}
        spinDuration={4}
        hideDefaultCursor={true}
        parallaxOn={true}
        hoverDuration={0.3}
      />

      <NotificationContainer 
        toast={notification} 
        confirm={confirmDialog} 
        onCloseConfirm={() => setConfirmDialog(null)} 
      />
      
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
          showToast={showToast}
          showConfirm={showConfirm}
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
          showToast={showToast}
          showConfirm={showConfirm}
        />
      )}
    </div>
  );
};

export default App;
