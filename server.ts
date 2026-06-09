import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db, UserRole, AudiobookStatus } from './src/db/dbEngine.ts';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-pdf-audiobook-key-2026';

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai_gemini = geminiApiKey ? new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Create storage directories securely
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AUDIOS_DIR = path.join(process.cwd(), 'audios');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIOS_DIR)) {
  fs.mkdirSync(AUDIOS_DIR, { recursive: true });
}

app.use(express.json());

// Token validation middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    // Fallback block to query or cookies if standard request
    const qToken = req.query.token;
    token = typeof qToken === 'string' ? qToken : undefined;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

// Admin validation middleware
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' });
  }
  next();
}

// ---------------- WAV SYNTH ENGINE ----------------
// Generates a real playable WAVE file with synthetic frequencies
function createSegmentWav(text: string, durationSeconds: number): Buffer {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;
  
  const buffer = Buffer.alloc(44 + dataSize);
  
  // WAV Header writing
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Speech modulation frequencies synthesis logic
  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Pleasant speech-cadence oscillation
    const baseFreq = 160 + 80 * Math.sin(2 * Math.PI * 1.8 * t) + 40 * Math.sin(2 * Math.PI * 5.4 * t);
    
    // Integrate frequency to get phase (prevents phase-wrap digital screaming artifacts)
    phase += (2 * Math.PI * baseFreq) / sampleRate;
    const wave = Math.sin(phase);
    
    // Envelope to mock pauses between sentences/words
    const wordRate = 4.0; // 4 syllables/words per second
    const wordEnvelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * wordRate * t);
    const amplitude = wordEnvelope > 0.45 ? 1.0 : 0.15;
    const val = Math.floor((wave * amplitude * 60) + 128);
    buffer.writeUInt8(val, 44 + i);
  }
  
  return buffer;
}

// ---------------- GEMINI REAL TTS ENGINE ----------------
// Generates a real vocal, high-quality audio file using Google's Gemini TTS API
async function generateSpeechWav(text: string): Promise<Buffer> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || !ai_gemini) {
    throw new Error('Chave de API do servidor não configurada ou cliente de voz não inicializado.');
  }

  db.addLog('info', 'TTS', `Enviando texto para a API de síntese do servidor: "${text.substring(0, 45)}..."`);

  const response = await ai_gemini.models.generateContent({
    model: 'gemini-3.1-flash-tts-preview',
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('A resposta do sintetizador não retornou nenhum áudio válido.');
  }

  const pcmBuffer = Buffer.from(base64Audio, 'base64');
  
  // Wrap the 24000Hz 16-bit Mono raw PCM in a valid WAV container so it's globally playable
  return pcmToWav(pcmBuffer, 24000);
}

// Helper to wrap Linear PCM into a WAV file buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // Linear PCM code
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// ---------------- AUTH API ROUTES ----------------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Este e-mail já está em uso.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  // Enforce USER role for all registrations to prevent privilege escalation. Only Admins can grant ADMIN rights.
  const userRole: UserRole = 'USER';
  const newUser = db.createUser(name, email, hash, userRole);

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Conta criada com sucesso!',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const user = db.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    db.addLog('warn', 'Login', `Falha de login de e-mail inexistente ou senha incorreta: ${email}`);
    return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
  }

  // Create login log
  db.addLog('info', 'Login', `Usuário realizou login com sucesso: ${user.name} (${user.email})`);

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// ---------------- LIBRARY / PUBLIC API ROUTES ----------------

app.get('/api/library', authenticateToken, (req: any, res) => {
  const allBooks = db.getAudiobooks();
  const tracks = db.getTracks();

  // Filter based on accessibility permissions
  const authorizedBooks = allBooks.filter(book => db.hasAccess(req.user.id, book.id));

  // Attach track stats info
  const booksWithStats = authorizedBooks.map(book => {
    const bookTracks = tracks.filter(t => t.audiobookId === book.id);
    const totalDuration = bookTracks.reduce((sum, t) => sum + t.duration, 0);
    return {
      ...book,
      tracksCount: bookTracks.length,
      duration: totalDuration,
    };
  });

  res.json(booksWithStats);
});

app.get('/api/audiobooks/:id/tracks', authenticateToken, (req: any, res) => {
  const audiobookId = req.params.id;
  
  if (!db.hasAccess(req.user.id, audiobookId)) {
    return res.status(403).json({ error: 'Você não tem permissão para acessar este audiobook.' });
  }

  const book = db.findAudiobookById(audiobookId);
  if (!book) {
    return res.status(404).json({ error: 'Audiobook não encontrado.' });
  }

  const tracks = db.getTracksForAudiobook(audiobookId);
  res.json({
    audiobook: book,
    tracks,
  });
});

// ---------------- DIAGOSTICO PUBLIC ENDPOINT FOR TTS TESTING ----------------
app.get('/api/diagnostico', async (req, res) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!ai_gemini) {
      return res.status(500).json({
        sucesso: false,
        chaveConfigurada: !!geminiApiKey,
        erro: 'Cliente de voz do servidor não inicializado. Verifique a chave de API.'
      });
    }

    const qText = req.query.texto;
    const testText = typeof qText === 'string' ? qText : 'Teste de diagnóstico de síntese de voz do servidor.';
    const buffer = await generateSpeechWav(testText);
    
    return res.json({
      sucesso: true,
      tamanhoWavBytes: buffer.length,
      rate: 24000,
      mensagem: 'Síntese de voz gerada com sucesso pela API do servidor.'
    });
  } catch (err: any) {
    return res.status(500).json({
      sucesso: false,
      erro: err.message || err.toString(),
      stack: err.stack,
      detalhesCompleto: err
    });
  }
});

// ---------------- SECURED TRACK STREAMING ROUTE ----------------

app.get('/api/tracks/:trackId/stream', authenticateToken, (req: any, res) => {
  const { trackId } = req.params;
  const track = db.getTracks().find(t => t.id === trackId);

  if (!track) {
    return res.status(404).json({ error: 'Faixa de áudio não encontrada.' });
  }

  // Security check: User must have permissions for the parent audiobook
  if (!db.hasAccess(req.user.id, track.audiobookId)) {
    return res.status(403).json({ error: 'Acesso negado. Você não possui permissão para reproduzir esta faixa.' });
  }

  const audioPath = path.join(AUDIOS_DIR, track.filePath);
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Arquivo físico de áudio não encontrado no servidor.' });
  }

  const stat = fs.statSync(audioPath);
  const totalLength = stat.size;

  // Standard secure streaming headers
  res.writeHead(200, {
    'Content-Type': 'audio/wav',
    'Content-Length': totalLength,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache',
  });

  // Flow the stream safely
  const stream = fs.createReadStream(audioPath);
  stream.pipe(res);
});

// ---------------- ADMIN API ROUTES ----------------

// Middleware configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // Limit to 50MB for larger PDFs
});

// MULTIPLE PDF UPLOADS & PROCESSING ENGINES
app.post('/api/admin/uploads', authenticateToken, requireAdmin, upload.array('files'), async (req: any, res) => {
  const files: any[] = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Nenhum PDF foi enviado.' });
  }

  const results: any[] = [];

  for (const file of files) {
    // Only accept PDFs
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      results.push({ name: file.originalname, error: 'Apenas arquivos PDF são aceitos.' });
      continue;
    }

    const title = file.originalname.replace(/\.[^/.]+$/, ""); // strip extension
    const savedFilename = `${Date.now()}-${file.originalname}`;
    const physicalPdfPath = path.join(UPLOADS_DIR, savedFilename);

    try {
      // Save physical PDF
      fs.writeFileSync(physicalPdfPath, file.buffer);

      // Create initial DB record: ENVIADO
      const audiobook = db.createAudiobook(title, savedFilename, 'ENVIADO');

      // Trigger asynchronous background processing right away to keep UI highly reactive!
      processPDFToAudiobookInBg(audiobook.id, file.buffer, savedFilename);

      results.push({
        id: audiobook.id,
        title: audiobook.title,
        originalPdf: savedFilename,
        status: 'ENVIADO',
      });
    } catch (err: any) {
      console.error('Failed to parse or save file details', err);
      results.push({ name: file.originalname, error: 'Falha interna ao salvar o arquivo.' });
    }
  }

  res.json({ message: 'Envio concluído. Arquivos estão sendo processados.', results });
});

// Error handling middleware to catch Multer file size limit errors gracefully
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'O arquivo enviado é muito grande. O limite máximo é de 50MB por arquivo.' });
    }
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  next(err);
});

// BACKGROUND PROCESSOR FOR PDF -> AUDIO TRACKS
async function processPDFToAudiobookInBg(audiobookId: string, pdfBuffer: Buffer, savedFilename: string) {
  db.updateAudiobookStatus(audiobookId, 'PROCESSANDO');

  try {
    // Parse PDF using modern mehmet-kozan/pdf-parse fork
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const text = textResult.text ? textResult.text.trim() : '';

    if (!text || text.length < 5) {
      // No readable text: NECESSITA_OCR
      db.updateAudiobookStatus(audiobookId, 'NECESSITA_OCR');
      return;
    }

    // Split text into pages/paragraphs (e.g. standard chunks of 300 to 500 characters)
    // We split by blank lines or paragraphs to create readable blocks
    const chunks = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    const finalChunks = chunks.length > 0 ? chunks : [text];

    // Limit to maximum 12 tracks to prevent heavy load, chunking nicely
    const tracksToCreate = finalChunks.slice(0, 10);

    for (let index = 0; index < tracksToCreate.length; index++) {
      const chunkText = tracksToCreate[index];
      const pageIndex = index + 1;
      const cleanTitle = `Faixa ${pageIndex}: ${chunkText.split(' ').slice(0, 4).join(' ')}...`;
      
      let wavBuffer: Buffer;
      let durationSeconds: number;
      let isFallback = false;

      try {
        // Attempt to generate real spoken speech
        wavBuffer = await generateSpeechWav(chunkText);
        // Since generateSpeechWav returns wav wrapped, the raw pcm data length is wavBuffer.length - 44
        const rawPcmLength = wavBuffer.length - 44;
        durationSeconds = Math.max(1, Math.round(rawPcmLength / 48000));
        db.addLog('info', 'TTS', `Faixa ${pageIndex} gerada com voz real do servidor. Duração: ${durationSeconds} segundos`);
      } catch (err: any) {
        db.addLog('warn', 'TTS', `Falha ao gerar voz real para a faixa ${pageIndex} (${err.message}). Usando fallback sintético.`);
        console.error(`Error generating TTS for chunk ${index}:`, err);
        
        // Fallback to basic simulated wave generator
        const wordCount = chunkText.split(/\s+/).length;
        durationSeconds = Math.max(5, Math.min(120, Math.floor(wordCount / 2.5)));
        wavBuffer = createSegmentWav(chunkText, durationSeconds);
        isFallback = true;
      }

      const trackFilename = `track-${audiobookId}-${pageIndex}.wav`;
      const physicalAudioPath = path.join(AUDIOS_DIR, trackFilename);

      fs.writeFileSync(physicalAudioPath, wavBuffer);

      // Save database Track entry
      db.createTrack(audiobookId, cleanTitle, trackFilename, durationSeconds, pageIndex, chunkText, isFallback);
    }

    // Processing successfully finished!
    db.updateAudiobookStatus(audiobookId, 'PRONTO');
  } catch (error: any) {
    console.error('Error background processing PDF conversion:', error);
    db.addLog('error', 'Falha na conversão detecção', `Erro no processador de PDF: ${error.message || error}. Stack: ${error.stack || ''}`);
    db.updateAudiobookStatus(audiobookId, 'FALHOU');
  }
}

// System Logs Endpoint
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req, res) => {
  res.json(db.getLogs());
});

// Users List
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));
  res.json(users);
});

// Admin Audiobooks view
app.get('/api/admin/audiobooks', authenticateToken, requireAdmin, (req, res) => {
  const books = db.getAudiobooks();
  const tracks = db.getTracks();
  const permissions = db.getPermissions();

  const booksWithMetadata = books.map(book => {
    const bookTracks = tracks.filter(t => t.audiobookId === book.id);
    const duration = bookTracks.reduce((sum, t) => sum + t.duration, 0);
    const bookPermissions = permissions.filter(p => p.audiobookId === book.id);

    return {
      ...book,
      tracksCount: bookTracks.length,
      duration,
      permissionsCount: bookPermissions.length,
    };
  });

  res.json(booksWithMetadata);
});

// Reprocess audiobook
app.post('/api/admin/audiobooks/:id/reprocess', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const book = db.findAudiobookById(id);
  if (!book) {
    return res.status(404).json({ error: 'Audiobook não encontrado.' });
  }

  const physicalPdfPath = path.join(UPLOADS_DIR, book.originalPdf);
  if (!fs.existsSync(physicalPdfPath)) {
    return res.status(400).json({ error: 'Arquivo PDF original não encontrado no servidor.' });
  }

  try {
    // Read the PDF buffer
    const pdfBuffer = fs.readFileSync(physicalPdfPath);

    // Delete old tracks from DB and physical media
    const oldTrackFiles = db.clearTracks(id);
    for (const file of oldTrackFiles) {
      const audioPath = path.join(AUDIOS_DIR, file);
      if (fs.existsSync(audioPath)) {
        try {
          fs.unlinkSync(audioPath);
        } catch (e) {
          console.error(`Falha ao excluir arquivo de áudio antigo: ${file}`, e);
        }
      }
    }

    // Set status to ENVIADO and trigger background conversion
    db.updateAudiobookStatus(id, 'ENVIADO');

    // Trigger process in background asynchronously
    processPDFToAudiobookInBg(id, pdfBuffer, book.originalPdf);

    db.addLog('info', 'Reprocessamento', `Reprocessamento manual solicitado para o audiobook: "${book.title}"`);

    res.json({ message: 'Reprocessamento iniciado com sucesso.' });
  } catch (err: any) {
    console.error('Error initiating reprocessing:', err);
    res.status(500).json({ error: `Erro ao iniciar reprocessamento: ${err.message || err}` });
  }
});

// Delete audiobook
app.delete('/api/admin/audiobooks/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const book = db.findAudiobookById(id);
  if (!book) {
    return res.status(404).json({ error: 'Audiobook não encontrado.' });
  }

  const { success, pdfName, trackFiles } = db.deleteAudiobook(id);
  if (!success) {
    return res.status(404).json({ error: 'Falha ao remover o audiobook do banco de dados.' });
  }

  // Delete physical PDF
  if (pdfName) {
    const pdfPath = path.join(UPLOADS_DIR, pdfName);
    if (fs.existsSync(pdfPath)) {
      try {
        fs.unlinkSync(pdfPath);
      } catch (e) {
        console.error(`Falha ao excluir PDF físico: ${pdfName}`, e);
      }
    }
  }

  // Delete physical tracks
  for (const trackFile of trackFiles) {
    const audioPath = path.join(AUDIOS_DIR, trackFile);
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {
        console.error(`Falha ao excluir arquivo de áudio físico: ${trackFile}`, e);
      }
    }
  }

  res.json({ message: 'Audiobook e mídias físicas excluídos com sucesso do sistema.' });
});

// Permissions list
app.get('/api/admin/permissions', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    permissions: db.getPermissions(),
    users: db.getUsers().map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
    audiobooks: db.getAudiobooks().map(a => ({ id: a.id, title: a.title, status: a.status }))
  });
});

app.post('/api/admin/permissions/grant', authenticateToken, requireAdmin, (req, res) => {
  const { userId, audiobookId } = req.body;
  if (!userId || !audiobookId) {
    return res.status(400).json({ error: 'IDs de usuário e audiobook são necessários.' });
  }

  const p = db.grantAccess(userId, audiobookId);
  if (!p) {
    return res.status(400).json({ error: 'Erro ao conceder acesso. Verifique se o usuário ou audiobook existem.' });
  }

  res.json({ message: 'Acesso concedido com sucesso.', permission: p });
});

app.post('/api/admin/permissions/revoke', authenticateToken, requireAdmin, (req, res) => {
  const { userId, audiobookId } = req.body;
  if (!userId || !audiobookId) {
    return res.status(400).json({ error: 'IDs de usuário e audiobook são necessários.' });
  }

  const success = db.revokeAccess(userId, audiobookId);
  if (!success) {
    return res.status(400).json({ error: 'Erro ao revogar acesso. Permissão não foi encontrada.' });
  }

  res.json({ message: 'Acesso revogado com sucesso.' });
});

app.post('/api/admin/users/role', authenticateToken, requireAdmin, (req: any, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'ID de usuário e perfil são obrigatórios.' });
  }

  if (role !== 'ADMIN' && role !== 'USER') {
    return res.status(400).json({ error: 'Perfil inválido. Use ADMIN ou USER.' });
  }

  // Prevent admin from demoting themselves by accident, which can break database access
  if (userId === req.user.id && role === 'USER') {
    return res.status(400).json({ error: 'Você não pode remover seu próprio perfil administrador para evitar bloqueio de controle.' });
  }

  const success = db.updateUserRole(userId, role);
  if (!success) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  res.json({ message: `Perfil do usuário atualizado para ${role} com sucesso.` });
});

// ---------------- SETUP FRONTEND SERVING MIDDLEWARE ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Server static production files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=== SERVER RUNNING ON PORT ${PORT} ===`);
    console.log(`Developer Dev Server: http://localhost:${PORT}`);

    // Auto-process any pending or stuck "ENVIADO" / "PROCESSANDO" books at boot
    try {
      const pendingBooks = db.getAudiobooks().filter(b => b.status === 'ENVIADO' || b.status === 'PROCESSANDO');
      if (pendingBooks.length > 0) {
        console.log(`[Boot Processor] Encontrados ${pendingBooks.length} audiobooks pendentes/em processamento.`);
        for (const book of pendingBooks) {
          const physicalPdfPath = path.join(UPLOADS_DIR, book.originalPdf);
          if (fs.existsSync(physicalPdfPath)) {
            const pdfBuffer = fs.readFileSync(physicalPdfPath);
            db.updateAudiobookStatus(book.id, 'ENVIADO'); // Reset to enviado to trigger conversion from start
            processPDFToAudiobookInBg(book.id, pdfBuffer, book.originalPdf);
            db.addLog('info', 'Processamento Automático', `Auto-iniciando processamento em segundo plano na inicialização para: "${book.title}"`);
          } else {
            db.updateAudiobookStatus(book.id, 'FALHOU');
            db.addLog('error', 'Processamento Automático', `Arquivo PDF físico não encontrado em uploads/ para o livro "${book.title}"`);
          }
        }
      }
    } catch (bootErr: any) {
      console.error('Erro no processador de inicialização:', bootErr);
    }

    // Executa teste diagnóstico automático da API de áudio e salva no db
    if (ai_gemini) {
      db.addLog('info', 'Diagnóstico Áudio', 'Iniciando teste de diagnóstico de voz do servidor...');
      generateSpeechWav('Teste de inicialização do sistema e síntese de voz real.')
        .then((buf) => {
          db.addLog('info', 'Diagnóstico Áudio', `Sucesso no teste de voz! Buffer de áudio gerado com ${buf.length} bytes (WAV).`);
          console.log(`TTS Startup Test Success: ${buf.length} bytes`);
        })
        .catch((err: any) => {
          const detail = err.stack ? err.stack.toString() : err.toString();
          db.addLog('error', 'Diagnóstico Áudio', `Falha crítica no teste de voz do servidor: ${err.message}. Detalhes erro: ${detail}`);
          console.error('TTS Startup Test Fail:', err);
        });
    } else {
      db.addLog('warn', 'Diagnóstico Áudio', 'Cliente de voz do servidor não inicializado. Verifique se a chave de API está configurada.');
      console.warn('TTS Startup Test: voice client was null.');
    }
  });
}

startServer();
