
export interface Experience {
  role: string;
  company: string;
  duration: string;
  description: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface ResumeData {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications: string[];
}

export interface AIPersona {
  name: string;
  tone: string;
  strengths: string[];
  expertise: string[];
  description: string;
  identifier: string;
  exampleResponses: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'like' | 'dislike';
}

export enum AppState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  UPLOADING = 'UPLOADING',
  DASHBOARD = 'DASHBOARD'
}
