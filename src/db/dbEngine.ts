import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'USER';
export type AudiobookStatus = 'ENVIADO' | 'PROCESSANDO' | 'PRONTO' | 'FALHOU' | 'NECESSITA_OCR';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface Audiobook {
  id: string;
  title: string;
  originalPdf: string;
  status: AudiobookStatus;
  createdAt: string;
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

export interface Permission {
  id: string;
  userId: string;
  audiobookId: string;
  grantedAt: string;
}

export interface Log {
  id: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  audiobooks: Audiobook[];
  tracks: Track[];
  permissions: Permission[];
  logs: Log[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

class DatabaseEngine {
  private data: DatabaseSchema = {
    users: [],
    audiobooks: [],
    tracks: [],
    permissions: [],
    logs: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.seed();
      }
    } catch (error) {
      console.error('Failed to parse database file, starting fresh', error);
      this.seed();
    }
  }

  private seed() {
    console.log('Seeding initial database contents...');
    
    // Default PW hashes
    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    const adminUser: User = {
      id: 'user-admin-1',
      name: 'Software Architect Admin',
      email: 'admin@audiobook.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    };

    const regularUser: User = {
      id: 'user-regular-2',
      name: 'Vitor Reis',
      email: 'user@audiobook.com',
      passwordHash: userHash,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };

    const initialLogs: Log[] = [
      {
        id: 'log-1',
        level: 'info',
        action: 'Cadastro',
        message: 'Usuário administrador e usuário padrão criados automaticamente no sistema.',
        createdAt: new Date().toISOString(),
      },
    ];

    this.data = {
      users: [adminUser, regularUser],
      audiobooks: [],
      tracks: [],
      permissions: [],
      logs: initialLogs,
    };

    this.save();
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving database metadata file', error);
    }
  }

  // LOGS Interface
  public getLogs(): Log[] {
    return [...this.data.logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public addLog(level: 'info' | 'warn' | 'error', action: string, message: string): Log {
    const log: Log = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      level,
      action,
      message,
      createdAt: new Date().toISOString(),
    };
    this.data.logs.push(log);
    this.save();
    return log;
  }

  // USERS Interface
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(name: string, email: string, passwordHash: string, role: UserRole = 'USER'): User {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.addLog('info', 'Cadastro', `Novo usuário cadastrado: ${name} (${email}) com perfil ${role}`);
    this.save();
    return newUser;
  }

  public updateUserRole(id: string, role: UserRole): boolean {
    const user = this.findUserById(id);
    if (user) {
      user.role = role;
      this.addLog('info', 'Alteração de Perfil', `Perfil do usuário "${user.name}" (${user.email}) alterado para ${role}`);
      this.save();
      return true;
    }
    return false;
  }

  // AUDIOBOOKS Interface
  public getAudiobooks(): Audiobook[] {
    return this.data.audiobooks;
  }

  public findAudiobookById(id: string): Audiobook | undefined {
    return this.data.audiobooks.find((a) => a.id === id);
  }

  public createAudiobook(title: string, originalPdf: string, status: AudiobookStatus = 'ENVIADO'): Audiobook {
    const newAudiobook: Audiobook = {
      id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      originalPdf,
      status,
      createdAt: new Date().toISOString(),
    };
    this.data.audiobooks.push(newAudiobook);
    this.addLog('info', 'Upload PDF', `PDF enviado: "${title}" (${originalPdf})`);
    this.save();
    return newAudiobook;
  }

  public updateAudiobookStatus(id: string, status: AudiobookStatus): boolean {
    const book = this.findAudiobookById(id);
    if (book) {
      book.status = status;
      if (status === 'PROCESSANDO') {
        this.addLog('info', 'Conversão iniciada', `Conversão para áudio iniciada: "${book.title}"`);
      } else if (status === 'PRONTO') {
        this.addLog('info', 'Conversão concluída', `Conversão para áudio concluída com sucesso: "${book.title}"`);
      } else if (status === 'FALHOU') {
        this.addLog('error', 'Falha na conversão', `Erro ao converter o PDF: "${book.title}"`);
      } else if (status === 'NECESSITA_OCR') {
        this.addLog('warn', 'Falha na conversão', `PDF não contém texto extraível (necessita OCR): "${book.title}"`);
      }
      this.save();
      return true;
    }
    return false;
  }

  // TRACKS Interface
  public getTracks(): Track[] {
    return this.data.tracks;
  }

  public getTracksForAudiobook(audiobookId: string): Track[] {
    return this.data.tracks
      .filter((t) => t.audiobookId === audiobookId)
      .sort((a, b) => a.order - b.order);
  }

  public createTrack(audiobookId: string, title: string, filePath: string, duration: number, order: number, text?: string, isFallback?: boolean): Track {
    const newTrack: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      audiobookId,
      title,
      filePath,
      duration,
      order,
      text,
      isFallback,
    };
    this.data.tracks.push(newTrack);
    this.save();
    return newTrack;
  }

  // PERMISSIONS Interface
  public getPermissions(): Permission[] {
    return this.data.permissions;
  }

  public hasAccess(userId: string, audiobookId: string): boolean {
    // Admins always have access
    const user = this.findUserById(userId);
    if (user?.role === 'ADMIN') return true;

    return this.data.permissions.some(
      (p) => p.userId === userId && p.audiobookId === audiobookId
    );
  }

  public grantAccess(userId: string, audiobookId: string): Permission | null {
    // Check if duplicate
    const exists = this.data.permissions.find(
      (p) => p.userId === userId && p.audiobookId === audiobookId
    );
    if (exists) return exists;

    const user = this.findUserById(userId);
    const book = this.findAudiobookById(audiobookId);
    if (!user || !book) return null;

    const newPermission: Permission = {
      id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      audiobookId,
      grantedAt: new Date().toISOString(),
    };
    this.data.permissions.push(newPermission);
    this.addLog(
      'info',
      'Concessão de acesso',
      `Acesso concedido ao usuário "${user.name}" (${user.email}) para o audiobook "${book.title}"`
    );
    this.save();
    return newPermission;
  }

  public revokeAccess(userId: string, audiobookId: string): boolean {
    const index = this.data.permissions.findIndex(
      (p) => p.userId === userId && p.audiobookId === audiobookId
    );
    if (index === -1) return false;

    const user = this.findUserById(userId);
    const book = this.findAudiobookById(audiobookId);

    this.data.permissions.splice(index, 1);
    this.addLog(
      'info',
      'Revogação de acesso',
      `Acesso revogado ao usuário "${user?.name || userId}" para o audiobook "${book?.title || audiobookId}"`
    );
    this.save();
    return true;
  }

  public deleteAudiobook(id: string): { success: boolean; pdfName?: string; trackFiles: string[] } {
    const bookIndex = this.data.audiobooks.findIndex((a) => a.id === id);
    if (bookIndex === -1) return { success: false, trackFiles: [] };

    const book = this.data.audiobooks[bookIndex];
    const pdfName = book.originalPdf;

    // Get track files to delete from disk
    const bookTracks = this.data.tracks.filter((t) => t.audiobookId === id);
    const trackFiles = bookTracks.map((t) => t.filePath);

    // Filter out from lists
    this.data.tracks = this.data.tracks.filter((t) => t.audiobookId !== id);
    this.data.permissions = this.data.permissions.filter((p) => p.audiobookId !== id);
    this.data.audiobooks.splice(bookIndex, 1);

    this.addLog('warn', 'Exclusão', `Audiobook excluído do sistema: "${book.title}"`);
    this.save();
    return { success: true, pdfName, trackFiles };
  }

  public clearTracks(audiobookId: string): string[] {
    const bookTracks = this.data.tracks.filter((t) => t.audiobookId === audiobookId);
    const trackFiles = bookTracks.map((t) => t.filePath);
    this.data.tracks = this.data.tracks.filter((t) => t.audiobookId !== audiobookId);
    this.save();
    return trackFiles;
  }
}

export const db = new DatabaseEngine();
