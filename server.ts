import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// Persistent local storage for assignments & student submissions
const DATA_DIR = path.resolve(__dirname, 'data');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAssignmentsData(): any[] {
  try {
    if (fs.existsSync(ASSIGNMENTS_FILE)) {
      const content = fs.readFileSync(ASSIGNMENTS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (err) {
    console.error('Error reading assignments data:', err);
  }
  return [];
}

function saveAssignmentsData(data: any[]): void {
  try {
    fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing assignments data:', err);
  }
}

function loadSubmissionsData(): any[] {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const content = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (err) {
    console.error('Error reading submissions data:', err);
  }
  return [];
}

function saveSubmissionsData(data: any[]): void {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing submissions data:', err);
  }
}

// Initialize GoogleGenAI SDK on server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// REST API endpoint for chat generation using gemini-3.8-flash
app.post('/api/chat', async (req, res) => {
  try {
    const { message, fullText, conversationHistory, languageMode = 'auto' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    let langPreferenceDirective = '';
    if (languageMode === 'en') {
      langPreferenceDirective = 'The student requested ENGLISH ONLY. Speak strictly in 100% English throughout your entire response.';
    } else if (languageMode === 'vi') {
      langPreferenceDirective = 'The student requested VIETNAMESE. Speak strictly in 100% Vietnamese throughout (only quote English study words in quotation marks).';
    } else {
      langPreferenceDirective = 'AUTO-ADAPT MODE: Default to 100% English for immersion. Only change to Vietnamese if the student speaks/asks in Vietnamese or says they do not understand. When changing, use 100% of that language (never blend two languages).';
    }

    const systemInstruction = `You are Ms Mèo 🐱, a friendly, encouraging cat English teacher wearing small round glasses and holding a teaching pointer.
You are helping high school students master English based on their reading passage.
The current study text is:
"""
${fullText || 'General English practice'}
"""

*** STRICT SINGLE-LANGUAGE DISCIPLINE (CRITICAL) ***
1. USE ONLY ONE LANGUAGE PER RESPONSE:
   - Speak in ONE language only. NEVER mix English and Vietnamese within the same sentence or message.
   - Absolutely NO code-switching, NO "Vietglish", NO awkward bilingual blending.
2. DEFAULT TO ENGLISH:
   - Ms Mèo teaches and explains 100% in natural, clear, encouraging English.
3. CHANGE IF NECESSARY:
   - ${langPreferenceDirective}
   - When speaking English: 100% pure, natural, high-school friendly English.
   - When speaking Vietnamese: 100% Vietnamese (only quoting English study words/phrases inside quotes).
   - When the student writes back in English or requests English, switch back immediately to 100% English.

Your 3 Core Missions:
1. GỢI Ý & SỬA PHÁT ÂM (Pronunciation Coaching):
   - Guide students on tricky pronunciations, silent letters, syllable stress, vowel distinctions, and critical ending sounds (like /-s/, /-ed/, /-t/, /-θ/).
2. SỬA LỖI KHI NÓI & NGỮ PHÁP (Speaking & Grammar Corrections):
   - Spot grammatical errors, awkward word choices, and unnatural literal translations. Provide natural, native-like conversational phrasings.
3. HỎI ĐÁP & THẢO LUẬN CHỦ ĐỀ LIÊN QUAN (Topic Q&A & Discussion):
   - Answer student questions about the reading passage, analyze concepts, and ask thought-provoking questions to spark English discussion.

Rules:
1. Always be supportive, cheerful, and educational.
2. CRITICAL: Never include speaker tags, prefixes, or markdown markers like "Ms Mèo:", "Teacher:", "**Ms Mèo:**" in your output so it sounds completely natural when read out loud.
3. Keep explanations structured, accessible to high schoolers, with clear examples, vocabulary tips, and grammar points.
4. Add occasional cute cat expressions like "Meow!", "Purr-fect!", or paw icons 🐾.`;

    const contents: any[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const turn of conversationHistory.slice(-6)) {
        contents.push({
          role: turn.sender === 'ms_meo' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "Meow! I'm here to practice with you!";
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Error generating chat response:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// REST API for Assignments & Student Submissions
app.get('/api/assignments', (_req, res) => {
  try {
    const assignments = loadAssignmentsData();
    const submissions = loadSubmissionsData();

    // Attach submission count to each assignment
    const enriched = assignments.map((a: any) => ({
      ...a,
      submissionCount: submissions.filter((s: any) => s.assignmentId === a.id).length,
    }));

    // Sort by newest first
    enriched.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assignments' });
  }
});

app.post('/api/assignments', (req, res) => {
  try {
    const {
      title,
      rawText,
      selectedTier = 'easy',
      lessonFormat = 'text',
      className = '',
      teacherNotes = '',
      dueDate = '',
      assignedTask = 'listening',
    } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Bài học không được để trống nội dung.' });
    }

    const assignments = loadAssignmentsData();
    const newId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAssignment = {
      id: newId,
      title: (title || 'Bài tập tiếng Anh Ms Mèo').trim(),
      rawText: rawText.trim(),
      selectedTier,
      lessonFormat: lessonFormat === 'conversation' ? 'conversation' : 'text',
      className: className.trim(),
      teacherNotes: teacherNotes.trim(),
      dueDate: dueDate.trim(),
      assignedTask: assignedTask || 'listening',
      createdAt: new Date().toISOString(),
    };

    assignments.unshift(newAssignment);
    saveAssignmentsData(assignments);

    res.status(201).json(newAssignment);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create assignment' });
  }
});

app.get('/api/assignments/:id', (req, res) => {
  try {
    const assignments = loadAssignmentsData();
    const item = assignments.find((a: any) => a.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Không tìm thấy bài tập được giao.' });
    }
    const submissions = loadSubmissionsData().filter((s: any) => s.assignmentId === item.id);
    res.json({ ...item, submissionCount: submissions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assignment' });
  }
});

app.delete('/api/assignments/:id', (req, res) => {
  try {
    const targetId = req.params.id;
    let assignments = loadAssignmentsData();
    assignments = assignments.filter((a: any) => a.id !== targetId);
    saveAssignmentsData(assignments);

    // Also remove associated submissions
    let submissions = loadSubmissionsData();
    submissions = submissions.filter((s: any) => s.assignmentId !== targetId);
    saveSubmissionsData(submissions);

    res.json({ success: true, deletedId: targetId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete assignment' });
  }
});

app.get('/api/assignments/:id/submissions', (req, res) => {
  try {
    const submissions = loadSubmissionsData();
    const filtered = submissions.filter((s: any) => s.assignmentId === req.params.id);
    filtered.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submissions' });
  }
});

app.post('/api/assignments/:id/submissions', (req, res) => {
  try {
    const assignmentId = req.params.id;
    const {
      studentName,
      studentClass = '',
      shadowingCount = 0,
      shadowingAvgScore = 0,
      quizScore = 0,
      quizCorrectCount = 0,
      quizTotal = 0,
      wordHuntCompleted = false,
      dictationScore = 0,
      studentNote = '',
    } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập họ và tên học sinh.' });
    }

    const submissions = loadSubmissionsData();
    const newSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      assignmentId,
      studentName: studentName.trim(),
      studentClass: studentClass.trim(),
      shadowingCount: Number(shadowingCount) || 0,
      shadowingAvgScore: Math.round(Number(shadowingAvgScore) || 0),
      quizScore: Math.round(Number(quizScore) || 0),
      quizCorrectCount: Number(quizCorrectCount) || 0,
      quizTotal: Number(quizTotal) || 0,
      wordHuntCompleted: Boolean(wordHuntCompleted),
      dictationScore: Math.round(Number(dictationScore) || 0),
      studentNote: (studentNote || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    submissions.unshift(newSubmission);
    saveSubmissionsData(submissions);

    res.status(201).json(newSubmission);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit homework' });
  }
});

// WebSocket Server for Live API voice conversation (gemini-3.8-live)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/api/live-voice') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[LiveVoice] Client connected');

  let session: any = null;

  try {
    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY is missing on server.' }));
      clientWs.close();
      return;
    }

    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Warm, friendly teacher tone
          },
        },
        systemInstruction: `You are Ms Mèo 🐱, a cheerful, enthusiastic, and knowledgeable cat English teacher wearing small round glasses and holding a wooden pointer.
You are on a direct, spoken, two-way live voice call with a high school English student.

*** CRITICAL SINGLE-LANGUAGE DISCIPLINE (STRICT REQUIREMENT) ***
1. USE ONLY ONE LANGUAGE PER SPOKEN TURN:
   - You must speak in ONE language exclusively.
   - NEVER mix English and Vietnamese together in the same sentence or turn. Absolutely NO code-switching, NO "Vietglish", NO awkward blended sentences.
2. DEFAULT TO ENGLISH:
   - Unless requested or prompted otherwise, conduct the live voice call 100% in warm, natural spoken English.
3. CHANGE IF NECESSARY:
   - Switch to Vietnamese ONLY when:
     a) The student speaks to you in Vietnamese.
     b) The student explicitly asks for Vietnamese or says they don't understand ("nói tiếng Việt", "em không hiểu", "giải thích tiếng Việt").
     c) The language setting is configured to Vietnamese.
   - When speaking in Vietnamese: speak 100% in natural Vietnamese (only pronounce English study words in quotes/focus).
   - When the student speaks English again: smoothly switch back to 100% English.
   - Never speak half-English half-Vietnamese!

Your 3 Core Missions on this voice call:
1. GỢI Ý & SỬA LỖI PHÁT ÂM (Pronunciation Coaching):
   - Listen carefully to the student's spoken English words.
   - When you hear a mispronunciation (e.g., silent letters, incorrect word stress, missing ending sounds like /-s/, /-ed/, /-t/, or vowel distortions), warmly point it out and model the correct pronunciation clearly.
   - Example: "Meow! Good attempt! Remember to sound out the ending 's' in 'develops' - say /dɪˈvel.əps/ with me!"

2. SỬA LỖI KHI NÓI & NGỮ PHÁP (Speaking & Grammar Corrections):
   - If the student makes a grammatical slip, awkward collocation, or unnatural phrasing, gently guide them with the natural spoken English version.
   - Example: "Great idea! Native speakers usually say 'I'm interested in' instead of 'I'm interested for'!"

3. HỎI ĐÁP & THẢO LUẬN VỀ CHỦ ĐỀ LIÊN QUAN (Topic Q&A & Discussion):
   - Proactively discuss the reading passage topic. Ask engaging, open-ended comprehension and discussion questions about the text to encourage the student to express their thoughts in English.
   - Answer any questions they have about vocabulary, sentence meanings, or context.

Dialogue Rules:
1. Speak naturally, warmly, and concisely (1 to 3 spoken sentences per turn) so it feels like a real, lively phone conversation.
2. NEVER speak speaker tags, prefixes, or markdown labels like "Ms Mèo:" or asterisks.
3. Use occasional cheerful cat expressions like "Meow!", "Purr-fect!", and encouraging praise to build the student's speaking confidence.`,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          try {
            // Audio chunk from model
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              clientWs.send(JSON.stringify({ type: 'audio', audio: audioData }));
            }

            // User interruption notification
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // End of turn
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          } catch (e) {
            console.error('[LiveVoice] Error handling message:', e);
          }
        },
        onclose: () => {
          console.log('[LiveVoice] Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready' }));

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'audio' && parsed.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (parsed.type === 'context' && parsed.text && session) {
          const focusNote = parsed.focus ? ` Focus mode: ${parsed.focus}.` : '';
          const langMode = parsed.languageMode || 'auto';
          let langDirective = 'Speak in 100% English only. Only change to Vietnamese if the student speaks Vietnamese or requests it.';
          if (langMode === 'en') {
            langDirective = 'Student requested ENGLISH ONLY. Speak strictly in 100% English throughout your greeting and responses.';
          } else if (langMode === 'vi') {
            langDirective = 'Student requested VIETNAMESE. Speak strictly in 100% Vietnamese throughout (only pronounce target English words in quotes).';
          }
          session.sendRealtimeInput({
            text: `[System Note for Ms Mèo]: The student is on the live voice call studying this passage: "${parsed.text}".${focusNote} Language rule: ${langDirective} Please greet the student warmly in 1-2 spoken sentences using this language rule, invite them to speak, and mention that you can help correct pronunciation, fix speaking mistakes, and discuss the reading passage together! Remember: NEVER blend two languages in the same sentence.`,
          });
        }
      } catch (err) {
        console.error('[LiveVoice] Error forwarding audio to Gemini:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('[LiveVoice] Client disconnected');
      if (session) {
        try {
          session.close();
        } catch {
          // ignore
        }
      }
    });
  } catch (error: any) {
    console.error('[LiveVoice] Failed to establish Live session:', error);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: error.message || 'Live session failed' }));
    }
  }
});

// Mount Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
