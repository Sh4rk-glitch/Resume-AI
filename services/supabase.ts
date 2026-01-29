
import { createClient } from '@supabase/supabase-js';
import { ResumeData, AIPersona, ChatMessage } from '../types';

const supabaseUrl = 'https://tvgsntlornobnhskgiao.supabase.co';
const supabaseAnonKey = 'sb_publishable_vviIz6NyU2fVqueBTrL76A_H25QgLbQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const saveResume = async (userId: string, resume: ResumeData, persona: AIPersona) => {
  const { data, error } = await supabase
    .from('resumes')
    .insert([
      { 
        user_id: userId, 
        resume_data: resume, 
        persona_data: persona,
        identifier: persona.identifier
      }
    ])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getUserResumes = async (userId: string) => {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getChatHistory = async (resumeId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: true });

  if (error) return [];
  
  return data.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at),
    feedback: m.feedback
  }));
};

export const saveChatMessage = async (resumeId: string, message: ChatMessage) => {
  const { error } = await supabase
    .from('chat_messages')
    .insert([{
      id: message.id,
      resume_id: resumeId,
      role: message.role,
      content: message.content,
      feedback: message.feedback,
      created_at: message.timestamp.toISOString()
    }]);

  if (error) console.error("Cloud sync failed:", error);
};

export const updateMessageFeedback = async (messageId: string, feedback: 'like' | 'dislike' | null) => {
  const { error } = await supabase
    .from('chat_messages')
    .update({ feedback })
    .eq('id', messageId);

  if (error) console.error("Feedback sync failed:", error);
};

export const clearChatHistory = async (resumeId: string) => {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('resume_id', resumeId);

  if (error) console.error("Cloud reset failed:", error);
};
