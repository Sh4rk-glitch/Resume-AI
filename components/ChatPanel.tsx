
import React, { useState, useRef, useEffect } from 'react';
import { ResumeData, AIPersona, ChatMessage } from '../types';
import { chatWithPersonaStream } from '../services/gemini';
import { getChatHistory, saveChatMessage, updateMessageFeedback, clearChatHistory } from '../services/supabase';

interface ChatPanelProps {
  resume: ResumeData;
  persona: AIPersona;
  resumeId?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ resume, persona, resumeId, showToast, showConfirm }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const typewriterQueue = useRef<string>('');
  const typewriterTargetId = useRef<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!resumeId) return;
      setIsSyncing(true);
      const history = await getChatHistory(resumeId);
      if (history.length > 0) {
        setMessages(history);
      } else {
        const welcomeMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Persona initialized. I am **${persona.name}**. I've synthesized your background in **${persona.expertise.slice(0, 2).join(' and ')}**. How can I assist with your career representation today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        saveChatMessage(resumeId, welcomeMessage);
      }
      setIsSyncing(false);
    };

    loadHistory();
  }, [resumeId, persona.name]);

  useEffect(() => {
    let interval: number;
    if (isWriting || typewriterQueue.current.length > 0) {
      interval = window.setInterval(() => {
        if (typewriterQueue.current.length > 0 && typewriterTargetId.current) {
          const count = typewriterQueue.current.length > 50 ? 3 : 1; 
          const nextChars = typewriterQueue.current.slice(0, count);
          typewriterQueue.current = typewriterQueue.current.slice(count);
          
          setMessages(prev => prev.map(m => 
            m.id === typewriterTargetId.current 
              ? { ...m, content: m.content + nextChars } 
              : m
          ));
        } else if (!isTyping && typewriterQueue.current.length === 0) {
          setIsWriting(false);
          const finishedMsg = messages.find(m => m.id === typewriterTargetId.current);
          if (finishedMsg && resumeId && finishedMsg.content.length > 0) {
             saveChatMessage(resumeId, finishedMsg);
          }
          typewriterTargetId.current = null;
        }
      }, 15);
    }
    return () => clearInterval(interval);
  }, [isWriting, isTyping, resumeId, messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isWriting]);

  const resetChat = async () => {
    if (!resumeId) return;
    showConfirm("Reset Brain Link", "Clear conversational memory?", async () => {
      await clearChatHistory(resumeId);
      const welcome = { id: crypto.randomUUID(), role: 'assistant', content: `Neural bridge reset.`, timestamp: new Date() } as ChatMessage;
      setMessages([welcome]);
      saveChatMessage(resumeId, welcome);
      showToast("Neural bridge reset successful.");
    });
  };

  const handleFeedback = async (id: string, feedback: 'like' | 'dislike') => {
    const currentMessage = messages.find(m => m.id === id);
    const newFeedback = currentMessage?.feedback === feedback ? null : feedback;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: newFeedback } : m));
    await updateMessageFeedback(id, newFeedback);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping || isWriting || !resumeId) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setIsWriting(true); 
    await saveChatMessage(resumeId, userMessage);

    const assistantMsgId = crypto.randomUUID();
    typewriterTargetId.current = assistantMsgId;
    typewriterQueue.current = '';
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() }]);

    try {
      const history = messages.filter(m => m.content && m.content.trim() !== '').map(m => ({ role: m.role, content: m.content }));
      const stream = chatWithPersonaStream(input, history, resume, persona);
      for await (const chunk of stream) {
        setIsTyping(false);
        typewriterQueue.current += chunk;
      }
    } catch (err: any) {
      let errorMessage = "The neural link was interrupted. Please check your connection.";
      if (err.message === "NEEDS_KEY_SELECTION") {
        errorMessage = "CRITICAL: No Gemini API Key detected. Please use the 'Connect Gemini Engine' button below to select a paid project key.";
      }
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: errorMessage } : m));
      showToast("Connection failed.", "error");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
           <span className={`w-2 h-2 rounded-full ${isWriting ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`}></span>
           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
             {isTyping ? 'Connecting...' : isWriting ? 'Streaming Logic...' : 'Neural Link Active'}
           </span>
        </div>
        <button onClick={resetChat} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors tracking-widest flex items-center group cursor-target">
          Reset Link
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
            <div className={`max-w-[85%] rounded-[2rem] p-6 shadow-sm border transition-all ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none border-indigo-500' : 'bg-gray-50 dark:bg-slate-800/40 text-gray-800 dark:text-slate-200 rounded-bl-none border-gray-100 dark:border-slate-700'
              }`}>
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {msg.content ? renderContent(msg.content) : (isTyping && idx === messages.length - 1) ? "..." : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text" className="w-full pl-6 pr-16 py-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none dark:text-white transition-all shadow-inner"
            placeholder="Interrogate your persona..." value={input} onChange={(e) => setInput(e.target.value)} disabled={isTyping || isWriting}
          />
          <button type="submit" disabled={!input.trim() || isTyping || isWriting} className="absolute right-3 top-3 p-3 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 disabled:opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
