
import React from 'react';

interface NotificationProps {
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  confirm: { title: string; message: string; onConfirm: () => void } | null;
  onCloseConfirm: () => void;
}

const NotificationContainer: React.FC<NotificationProps> = ({ toast, confirm, onCloseConfirm }) => {
  return (
    <>
      {/* Toast Notification */}
      <div className={`fixed bottom-8 right-8 z-[10000] transition-all duration-500 transform ${toast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'}`}>
        <div className={`glass px-8 py-5 rounded-[2rem] shadow-2xl flex items-center space-x-4 border border-white/10 ${
          toast?.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-600 text-white'
        }`}>
          {toast?.type === 'success' && (
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          <span className="font-bold text-sm tracking-tight">{toast?.message}</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <div className={`fixed inset-0 z-[10001] flex items-center justify-center p-6 transition-all duration-300 ${confirm ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onCloseConfirm}></div>
        <div className={`relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-slate-800 transition-all duration-500 transform ${confirm ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{confirm?.title}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
              {confirm?.message}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onCloseConfirm}
                className="py-4 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-gray-100 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all cursor-target"
              >
                Cancel
              </button>
              <button 
                onClick={() => { confirm?.onConfirm(); onCloseConfirm(); }}
                className="py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all cursor-target"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationContainer;
