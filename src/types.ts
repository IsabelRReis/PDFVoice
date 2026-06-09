export type UserRole = 'ADMIN' | 'USER';
export type AudiobookStatus = 'ENVIADO' | 'PROCESSANDO' | 'PRONTO' | 'FALHOU' | 'NECESSITA_OCR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
}

export interface Audiobook {
  id: string;
  title: string;
  originalPdf: string;
  status: AudiobookStatus;
  createdAt: string;
  tracksCount: number;
  duration: number; // in seconds
}

export interface Track {
  id: string;
  audiobookId: string;
  title: string;
  filePath: string;
  duration: number; // in seconds
  order: number;
  text?: string;
  isFallback?: boolean;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  createdAt: string;
}

export interface Permission {
  id: string;
  userId: string;
  audiobookId: string;
  grantedAt: string;
}
