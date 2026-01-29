
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthProps {
  onSuccess: () => void;
  onBack: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

const Auth: React.FC<AuthProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('signin');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMessage('Check your email for the confirmation link!');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMessage('Password reset link has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'signup') return 'Create your account';
    if (mode === 'forgot') return 'Reset Password';
    return 'Sign in to Resume AI';
  };

  const getSubtitle = () => {
    if (mode === 'forgot') return 'Enter your email to receive a recovery link.';
    return 'Secure your persona and professional brand.';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-12 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 animate-fade-in-up">
        <div className="text-center">
          <div className="bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-6 shadow-xl shadow-indigo-500/20">RAI</div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {getTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            {getSubtitle()}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-5 py-4 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-slate-800 dark:text-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Password</label>
                  {mode === 'signin' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  className="w-full px-5 py-4 border border-gray-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-slate-800 dark:text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-green-600 text-xs font-bold text-center bg-green-50 dark:bg-green-950/20 p-4 rounded-2xl border border-green-100 dark:border-green-900/20">
              {successMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 space-y-4">
          {mode === 'forgot' ? (
            <button
              onClick={() => setMode('signin')}
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          )}
        </div>

        <button 
          onClick={onBack}
          className="w-full text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:text-slate-600 dark:hover:text-slate-400 mt-6 transition-colors"
        >
          ← Cancel
        </button>
      </div>
    </div>
  );
};

export default Auth;
