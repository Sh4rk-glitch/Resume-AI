
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
  "Extracting multi-modal experience...",
  "Synthesizing persona tone...",
  "Mapping expert skill nodes...",
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
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
      } else {
        setError({ title: "Incompatible Format", msg: "Please provide a PDF or high-quality image of your resume." });
      }
    }
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
        throw new Error("Please upload a file or paste your resume text.");
      }
      onComplete(result);
    } catch (err: any) {
      console.error("Synthesis Error:", err);
      setError({
        title: "Synthesis Blocked",
        msg: err.message || "The neural engine was unable to parse your history. Please try a different format or paste the text directly."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl">
        <div className="relative w-full max-w-sm px-6 text-center">
          <div className="relative w-24 h-24 mx-auto mb-12">
            <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-3xl"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-3xl animate-spin"></div>
            <div className="absolute inset-4 bg-indigo-600/10 rounded-xl animate-pulse flex items-center justify-center text-indigo-600 font-black text-xs">AI</div>
          </div>
          <h2 className="text-3xl font-black dark:text-white mb-3 tracking-tighter">Deep Scan In Progress</h2>
          <div className="flex flex-col space-y-2">
            <p className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{LOADING_STAGES[loadingStageIdx]}</p>
            <div className="w-full h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500" 
                style={{ width: `${((loadingStageIdx + 1) / LOADING_STAGES.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 animate-fade-in-up">
      <button onClick={onBack} className="mb-12 text-indigo-600 dark:text-indigo-400 font-black flex items-center transition-all hover:-translate-x-1 group uppercase text-[10px] tracking-widest cursor-target">
        <span className="mr-2">←</span> Back to System Root
      </button>

      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[3rem] p-10 md:p-16 border border-gray-100 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 relative z-10">
          <div>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-3 tracking-tighter">Neural Synthesis</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-lg">Upload your professional blueprint.</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-800/50 p-2 rounded-[1.5rem] border border-gray-200/50 dark:border-slate-700/50">
            <button onClick={() => setMode('upload')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-target ${mode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-slate-500 hover:text-indigo-400'}`}>Upload DNA</button>
            <button onClick={() => setMode('paste')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-target ${mode === 'paste' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-slate-500 hover:text-indigo-400'}`}>Paste Code</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
          {mode === 'upload' ? (
            <div 
              className={`relative border-2 border-dashed rounded-[3rem] p-20 text-center transition-all cursor-target group ${dragActive ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/20 hover:border-indigo-400'}`} 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setFile(e.target.files[0])} className="hidden" accept=".pdf,.docx,image/png,image/jpeg" />
              <div className="flex flex-col items-center">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl transition-all duration-500 ${file ? 'bg-green-100 text-green-600 scale-110 rotate-3' : 'bg-indigo-600 text-white group-hover:scale-105'}`}>
                  {file ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  )}
                </div>
                {file ? (
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{file.name}</p>
                    <button type="button" onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline">Clear Material</button>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Drop Resume Source</p>
                    <p className="text-gray-400 dark:text-slate-500 text-sm mb-8 font-medium">Supports PDF, PNG, or JPEG</p>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-gray-700 dark:text-white shadow-xl hover:shadow-indigo-500/10 transition-all active:scale-95 cursor-target">Initialize Browse</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <textarea 
              className="w-full px-10 py-8 rounded-[3rem] border border-gray-200 dark:border-slate-800 outline-none text-gray-800 dark:text-white bg-gray-50 dark:bg-slate-800 shadow-inner h-80 resize-none cursor-target focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium leading-relaxed" 
              placeholder="Paste the raw text of your resume here..." 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
            />
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-10 rounded-[3rem] border border-red-100 dark:border-red-900/30 animate-shake">
              <h3 className="text-lg font-black uppercase tracking-[0.2em] mb-3">{error.title}</h3>
              <p className="text-sm font-medium leading-relaxed opacity-80">{error.msg}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || (mode === 'upload' ? !file : !text.trim())} 
            className="w-full py-7 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] active:scale-[0.98] disabled:opacity-30 disabled:shadow-none transition-all cursor-target flex items-center justify-center space-x-4"
          >
            <span>Launch Synthesis Pipeline</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResumeUpload;
