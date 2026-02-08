
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parseResume } from '../services/gemini';
import { ResumeData, AIPersona } from '../types';

interface ResumeUploadProps {
  onComplete: (data: { resume: ResumeData; persona: AIPersona }) => void;
  onBack: () => void;
}

const LOADING_STAGES = [
  "Initializing neural link...",
  "Scanning document structures...",
  "Extracting professional DNA...",
  "Identifying career milestones...",
  "Analyzing skill clusters...",
  "Synthesizing persona tone...",
  "Optimizing agent response logic...",
  "Deploying autonomous assistant..."
];

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onComplete, onBack }) => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [error, setError] = useState<{title: string, msg: string, checklist?: string[], showBridge?: boolean} | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleOpenBridge = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setError(null); 
      } catch (err) {
        console.error("Bridge failed:", err);
      }
    }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setLoadingStageIdx(0);

    try {
      let result;
      if (mode === 'upload' && file) {
        const base64 = await fileToBase64(file);
        result = await parseResume({ data: base64, mimeType: file.type });
      } else if (mode === 'paste' && text.trim()) {
        result = await parseResume(text);
      } else {
        throw new Error("EMPTY_INPUT");
      }
      onComplete(result);
    } catch (err: any) {
      let errorDetails = {
        title: "Synthesis Error",
        msg: err.message || "An unexpected error occurred during synthesis.",
        checklist: [] as string[],
        showBridge: false
      };

      if (err.message === "API_KEY_MISSING") {
        errorDetails = {
          title: "Browser Key Missing",
          msg: `The Gemini engine is active but can't find your API Key in the Vercel environment. Vercel hides environment variables from the browser by default.`,
          checklist: [
            "Rename 'API_KEY' to 'NEXT_PUBLIC_API_KEY' in Vercel settings.",
            "In Vercel, ensure 'Production' environment is CHECKED for this variable.",
            "Redeploy your Vercel project after updating settings.",
            "OR: Establish a temporary link using the button below."
          ],
          showBridge: true
        };
      } else if (err.message.includes("API_KEY_INVALID")) {
         errorDetails = {
          title: "Invalid API Key",
          msg: "The provided key was rejected by Google Gemini.",
          checklist: ["Check for trailing spaces in your Vercel variable.", "Ensure your API key is active in Google AI Studio."],
          showBridge: true
        };
      }
      
      setError(errorDetails);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl animate-fade-in">
        <div className="relative w-full max-w-lg px-6 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-12">
            <div className="absolute inset-0 rounded-3xl border-2 border-indigo-500/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-3xl border-t-4 border-indigo-600 animate-spin"></div>
            <div className="absolute inset-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center overflow-hidden">
               <div className="w-full h-1 bg-indigo-500/40 absolute animate-[scan_2s_ease-in-out_infinite]"></div>
               <span className="text-4xl">🧠</span>
            </div>
          </div>
          <h2 className="text-3xl font-black dark:text-white mb-4 text-center tracking-tighter">Sequencing Persona...</h2>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mb-8">
            <div className="h-full bg-indigo-600 transition-all duration-1000 ease-out" style={{ width: `${((loadingStageIdx + 1) / LOADING_STAGES.length) * 100}%` }}></div>
          </div>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">{LOADING_STAGES[loadingStageIdx]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in-up">
      <button onClick={onBack} className="mb-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold flex items-center transition-colors group uppercase text-[10px] tracking-widest cursor-target">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Cancel Synthesis
      </button>

      <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] p-8 md:p-12 border border-gray-100 dark:border-slate-800 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Evolve Your Persona</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Inject your professional DNA into our neural engine.</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button onClick={() => setMode('upload')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-target ${mode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}>Upload PDF</button>
            <button onClick={() => setMode('paste')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-target ${mode === 'paste' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}>Paste Text</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {mode === 'upload' ? (
            <div className={`relative border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all cursor-target ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/10 scale-[1.01]' : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/20 hover:border-indigo-300'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,image/*" />
              <div className="flex flex-col items-center">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-colors shadow-inner ${file ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'}`}>
                  {file ? <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
                </div>
                {file ? <div className="space-y-2"><p className="text-xl font-black text-gray-900 dark:text-white">{file.name}</p><p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB • Synthesis Ready</p><button type="button" onClick={() => setFile(null)} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline mt-4 cursor-target">Purge File</button></div> : <><p className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Drop Source Material</p><p className="text-gray-400 font-medium mb-8">Support for high-fidelity PDF and DOCX</p><button type="button" onClick={() => fileInputRef.current?.click()} className="px-10 py-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest text-gray-700 dark:text-white shadow-xl hover:shadow-indigo-500/10 transition-all active:scale-95 cursor-target">Browse DNA</button></>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label htmlFor="resumeText" className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest ml-1">Raw Resume Data</label>
              <textarea id="resumeText" rows={12} className="w-full px-8 py-6 rounded-[2rem] border border-gray-200 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none text-gray-800 dark:text-white transition-all resize-none bg-gray-50 dark:bg-slate-800 shadow-inner cursor-target" placeholder="Ctrl+V your history here..." value={text} onChange={(e) => setText(e.target.value)} disabled={isLoading} />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-8 rounded-[2rem] border border-red-100 dark:border-red-900/30">
              <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <span className="text-lg font-black uppercase tracking-widest">{error.title}</span>
              </div>
              <p className="text-sm font-bold mb-6 leading-relaxed">{error.msg}</p>
              
              {error.checklist && error.checklist.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-red-200 dark:border-red-900/30 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-300 mb-2">Required Infrastructure Fixes:</p>
                  {error.checklist.map((item, i) => (
                    <div key={i} className="flex items-start text-xs font-medium">
                      <span className="mr-3 mt-1.5 w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}

              {error.showBridge && (
                <div className="relative z-[200]">
                  <button 
                    type="button" 
                    onClick={handleOpenBridge}
                    className="w-full py-5 bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/30 hover:bg-red-700 transition-all cursor-target flex items-center justify-center border-2 border-white/20"
                  >
                    <span className="mr-3 animate-ping">⚡</span>
                    Establish Neural Bridge Now
                  </button>
                  <p className="text-center text-[9px] font-black uppercase tracking-widest mt-4 opacity-60">Manual bypass for local testing</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button type="submit" disabled={isLoading || (mode === 'upload' ? !file : !text.trim())} className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] text-white transition-all shadow-2xl cursor-target ${isLoading || (mode === 'upload' ? !file : !text.trim()) ? 'bg-gray-200 dark:bg-slate-800 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 active:scale-95'}`}>Generate Neural Persona</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeUpload;
