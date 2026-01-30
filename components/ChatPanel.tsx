
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
    
    showConfirm(
      "Reset Brain Link", 
      "Resetting will clear the persona's conversational memory. This cannot be undone. Proceed?", 
      async () => {
        await clearChatHistory(resumeId);
        const welcome = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Neural bridge reset. Persona **${persona.name}** is at baseline.`,
          timestamp: new Date()
        } as ChatMessage;
        setMessages([welcome]);
        saveChatMessage(resumeId, welcome);
        showToast("Neural bridge reset successful.");
      }
    );
  };

  const handleFeedback = async (id: string, feedback: 'like' | 'dislike') => {
    const currentMessage = messages.find(m => m.id === id);
    const newFeedback = currentMessage?.feedback === feedback ? null : feedback;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: newFeedback } : m));
    await updateMessageFeedback(id, newFeedback);
    if (newFeedback) showToast("Feedback recorded. Refining model...");
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

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setIsWriting(true); 
    
    await saveChatMessage(resumeId, userMessage);

    const assistantMsgId = crypto.randomUUID();
    typewriterTargetId.current = assistantMsgId;
    typewriterQueue.current = '';

    const newAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newAssistantMessage]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const stream = chatWithPersonaStream(input, history, resume, persona);
      
      for await (const chunk of stream) {
        setIsTyping(false);
        typewriterQueue.current += chunk;
      }
      
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "The neural link was interrupted. Please try again." } : m));
      showToast("Connection interrupted.", "error");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/30 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
           <span className={`w-2 h-2 rounded-full ${isWriting ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`}></span>
           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest transition-all">
             {isTyping ? 'Connecting...' : isWriting ? 'Streaming Logic...' : 'Neural Link Active'}
           </span>
        </div>
        <button onClick={resetChat} className="text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors tracking-widest flex items-center group cursor-target">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
            <div className={`max-w-[85%] rounded-[2rem] p-6 shadow-sm border transition-all ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none border-indigo-500' 
                  : 'bg-gray-50 dark:bg-slate-800/40 text-gray-800 dark:text-slate-200 rounded-bl-none border-gray-100 dark:border-slate-700'
              }`}>
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                {msg.content ? renderContent(msg.content) : (isTyping && idx === messages.length - 1) ? (
                  <div className="flex space-x-1 py-1">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                ) : null}
                {isWriting && idx === messages.length - 1 && msg.role === 'assistant' && msg.content && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-500 rounded-full animate-pulse align-middle"></span>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                {msg.role === 'assistant' && msg.content && !isWriting && !isTyping && (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleFeedback(msg.id, 'like')} className={`p-1 rounded-lg transition-all cursor-target ${msg.feedback === 'like' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 10.333z" />
                      </svg>
                    </button>
                    <button onClick={() => handleFeedback(msg.id, 'dislike')} className={`p-1 rounded-lg transition-all cursor-target ${msg.feedback === 'dislike' ? 'text-red-500 bg-red-50' : 'text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-2.266z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            className="w-full pl-6 pr-16 py-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none dark:text-white transition-all shadow-inner cursor-target"
            placeholder="Interrogate your persona..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping || isWriting}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || isWriting}
            className="absolute right-3 top-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 shadow-lg shadow-indigo-600/20 active:scale-95 cursor-target"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-2">
          {persona.exampleResponses.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setInput(suggestion)}
              className="text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-gray-500 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm cursor-target"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
