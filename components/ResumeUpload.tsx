
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parseResume } from '../services/gemini';
import { ResumeData, AIPersona } from '../types';

interface ResumeUploadProps {
  onComplete: (data: { resume: ResumeData; persona: AIPersona }) => void;
  onBack: () => void;
}

const LOADING_STAGES = [
  "Initializing neural link...",
  "Scanning professional DNA...",
  "Synthesizing persona tone...",
  "Optimizing agent logic..."
];

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onComplete, onBack }) => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [error, setError] = useState<{title: string, msg: string} | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (mode === 'upload' && file) {
        const base64 = await fileToBase64(file);
        result = await parseResume({ data: base64, mimeType: file.type });
      } else if (mode === 'paste' && text.trim()) {
        result = await parseResume(text);
      } else {
        throw new Error("Please provide resume data.");
      }
      onComplete(result);
    } catch (err: any) {
      setError({
        title: "Synthesis Failed",
        msg: err.message || "The neural engine could not process this document. Please try again or use plain text."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
        <div className="relative w-full max-w-sm px-6 text-center">
          <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-3xl animate-spin mx-auto mb-10"></div>
          <h2 className="text-2xl font-black dark:text-white mb-2 tracking-tight">Sequencing Persona</h2>
          <p className="text-indigo-500 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">{LOADING_STAGES[loadingStageIdx]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in-up">
      <button onClick={onBack} className="mb-8 text-indigo-600 dark:text-indigo-400 font-bold flex items-center transition-colors group uppercase text-[10px] tracking-widest cursor-target">
        ← Back to Landing
      </button>

      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] p-8 md:p-12 border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Evolve Your Persona</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Inject your professional history into our neural engine.</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button onClick={() => setMode('upload')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-target ${mode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-slate-500'}`}>Upload PDF</button>
            <button onClick={() => setMode('paste')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-target ${mode === 'paste' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-slate-500'}`}>Paste Text</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {mode === 'upload' ? (
            <div className={`relative border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all cursor-target ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/10' : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/20 hover:border-indigo-300'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} className="hidden" accept=".pdf,.docx,text/plain" />
              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${file ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {file ? <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                </div>
                {file ? <p className="text-xl font-black text-gray-900 dark:text-white">{file.name}</p> : <><p className="text-xl font-black text-gray-900 dark:text-white mb-2">Drop DNA File</p><button type="button" onClick={() => fileInputRef.current?.click()} className="px-8 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl font-black text-xs uppercase tracking-widest text-gray-700 dark:text-white shadow-xl cursor-target">Browse Material</button></>}
              </div>
            </div>
          ) : (
            <textarea className="w-full px-8 py-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 outline-none text-gray-800 dark:text-white bg-gray-50 dark:bg-slate-800 shadow-inner h-64 resize-none cursor-target" placeholder="Paste your resume content here..." value={text} onChange={(e) => setText(e.target.value)} />
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-8 rounded-[2rem] border border-red-100 dark:border-red-900/30">
              <h3 className="text-lg font-black uppercase tracking-widest mb-2">{error.title}</h3>
              <p className="text-sm font-medium leading-relaxed">{error.msg}</p>
            </div>
          )}

          <button type="submit" disabled={isLoading || (mode === 'upload' ? !file : !text.trim())} className="w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 active:scale-95 disabled:opacity-50 transition-all cursor-target">
            Generate Neural Persona
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResumeUpload;
