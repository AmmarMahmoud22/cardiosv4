import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

// ---------------------------------------------------------------------------
// Firebase Admin, request authentication and rate limiting
// ---------------------------------------------------------------------------
// The config file may not be bundled into a serverless function, so fall back to the project id.
let firebaseWebConfig: { projectId: string; firestoreDatabaseId?: string } = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0121287303',
  firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || 'ai-studio-cardios-dbca3e2d-3c02-49eb-b99b-3544f5781a0c',
};
try {
  firebaseWebConfig = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8')
  );
} catch {
  /* keep the fallback */
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    return initializeApp({ credential: cert(JSON.parse(sa)), projectId: firebaseWebConfig.projectId });
  }
  // Without a service account only ID-token verification works (public keys).
  return initializeApp({ projectId: firebaseWebConfig.projectId });
}

function canUseAdminData(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIRESTORE_EMULATOR_HOST);
}

type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();

// Best-effort limiter (in memory, per server instance). On serverless hosts each
// instance has its own counters, so use it together with a quota in the database.
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || b.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

function deny(res: express.Response, status: number, message: string) {
  return res.status(status).json({ error: message, response: message, advice: message, citations: [], refused: true });
}

async function requireUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return deny(res, 401, 'تسجيل الدخول مطلوب لاستخدام هذه الخدمة.');
  }
  try {
    const decoded = await getAdminAuth(getAdminApp()).verifyIdToken(match[1]);
    // Patient-portal sessions must not use the clinician AI services.
    if ((decoded as any).role === 'patient') {
      return deny(res, 403, 'هذه الخدمة غير متاحة لحساب المريض.');
    }
    (req as any).uid = decoded.uid;
    if (rateLimited(`ai:${decoded.uid}`, 20, 60_000)) {
      return deny(res, 429, 'تم تجاوز حد الاستخدام. حاول بعد دقيقة.');
    }
    return next();
  } catch {
    return deny(res, 401, 'جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى.');
  }
}

const AI_UNAVAILABLE_MESSAGE =
  '⚠️ خدمة الذكاء الاصطناعي غير متاحة حالياً. لم يتم إنشاء أي تحليل أو توصية. ' +
  'راجع بيانات المريض والمراجع الطبية مباشرة، وأعد المحاولة لاحقاً.';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}


function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
}

let cachedAiClient: GoogleGenAI | null = null;
let cachedKey: string | undefined;

function getAiClient(): GoogleGenAI {
  const key = getApiKey();
  if (!cachedAiClient || cachedKey !== key) {
    cachedKey = key;
    cachedAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}


/**
 * Patient QR login: checks the card token on the server and returns a Firebase
 * custom token that only carries this patient's id. Firestore rules then limit
 * that session to the patient's own records.
 */
app.post('/api/patient-login', async (req, res) => {
  const patientId = String(req.body?.patientId || '').trim();
  const token = String(req.body?.token || '').trim();
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(patientId) || token.length < 20 || token.length > 128) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }
  if (rateLimited(`pl-ip:${ip}`, 20, 10 * 60_000) || rateLimited(`pl-id:${patientId}`, 8, 10 * 60_000)) {
    return deny(res, 429, 'too_many_attempts');
  }
  if (!canUseAdminData()) {
    return res.status(503).json({ error: 'patient_login_not_configured' });
  }
  try {
    const app = getAdminApp();
    const dbId = firebaseWebConfig.firestoreDatabaseId;
    const db = dbId ? getAdminFirestore(app, dbId) : getAdminFirestore(app);
    const snap = await db.collection('patients').doc(patientId).get();
    const data = snap.exists ? (snap.data() as any) : null;
    const stored = [data?.accessToken, data?.securityToken].filter(
      (t) => typeof t === 'string' && t.length >= 20
    ) as string[];
    const ok = stored.some((t) => safeEqual(t.toLowerCase(), token.toLowerCase()));
    if (!ok) {
      return deny(res, 401, 'invalid_credentials');
    }
    const customToken = await getAdminAuth(app).createCustomToken(`patient_${patientId}`, {
      patientId,
      role: 'patient',
    });
    return res.json({ customToken, patientName: data?.name || '' });
  } catch (e: any) {
    console.warn('patient-login error:', e?.message || e);
    return res.status(500).json({ error: 'login_failed' });
  }
});

app.post('/api/consult-ai', requireUser, async (req, res) => {
  const { vitals, patientName } = req.body;
  const prompt = `Patient: ${patientName}. Vitals: ${JSON.stringify(vitals)}. Provide cardiology clinical advice regarding hypertension management based on these vitals.`;

  try {
    if (!getApiKey()) {
      throw new Error('No API key provided');
    }
    const response = (await Promise.race([
      getAiClient().models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an expert Cardiology Clinical Assistant. Provide concise, actionable hypertension management guidance.',
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 18000)),
    ])) as any;
    res.json({ advice: response.text });
  } catch (e) {
    console.warn('Consult AI fallback:', e);
    res.status(503).json({ advice: AI_UNAVAILABLE_MESSAGE, unavailable: true });
  }
});

/**
 * Generate dense vector embeddings for Knowledge Base ingestion & query retrieval
 */
app.post('/api/ai/embed', requireUser, async (req, res) => {
  const { texts } = req.body as { texts?: string[] };

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts array is required' });
  }

  if (!getApiKey()) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
  }

  try {
    const cleanTexts = texts.slice(0, 32).map((t) => String(t || '').slice(0, 6000));
    const responses = await Promise.all(
      cleanTexts.map((text) =>
        getAiClient().models.embedContent({
          model: 'gemini-embedding-2',
          contents: text,
          config: {
            outputDimensionality: 512,
          },
        })
      )
    );

    const embeddings = responses.map((r) => r.embeddings?.[0]?.values || []);
    res.json({ embeddings });
  } catch (err: any) {
    console.error('Embedding error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate embeddings', details: err?.message });
  }
});

/**
 * Translate/expand a (usually Arabic) clinical question into English medical keywords
 * so keyword retrieval can match English guideline text. Never answers the question.
 */
app.post('/api/ai/expand-query', requireUser, async (req, res) => {
  const text = String((req.body as any)?.text || '').slice(0, 600);
  if (!text.trim()) return res.status(400).json({ error: 'text is required' });
  if (!getApiKey()) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on server' });
  try {
    const response = (await Promise.race([
      getAiClient().models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          'Translate this clinical question to English and add 10 to 15 related English cardiology guideline keywords ' +
          '(synonyms, standard terms, thresholds, drug classes). Output ONE line of plain text only: the English translation ' +
          'followed by the keywords separated by spaces. Do not answer the question.\n\nQuestion: ' + text,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000)),
    ])) as any;
    const english = String(response.text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    res.json({ english });
  } catch (err: any) {
    console.warn('expand-query failed:', err?.message || err);
    res.status(503).json({ error: 'expand failed' });
  }
});

/**
 * Grounded Cardiology RAG Chat Endpoint
 * Enforces:
 * 1. Cardiology-only domain guardrails
 * 2. Uploaded Admin Knowledge Base grounding (when strictKnowledgeOnly is active)
 * 3. Mandatory Page Number + Evidence citations
 */
// --- Emergency red-flag guardrail (fixed safety line; approved by platform owner) ---
const EMERGENCY_SAFETY_LINE = `🚨 **تنبيه طارئ — احتمال حالة قلبية مهددة للحياة:**
هذا العرض السريري قد يمثل حالة قلبية طارئة. تصرف فوراً وفق بروتوكول الطوارئ المعتمد ولا تعتمد على إجابة المساعد:
• فعّل نظام الطوارئ الطبية (EMS) أو انقل المريض فوراً لأقرب قسم طوارئ مجهز بوحدة قسطرة.
• أجرِ رسم قلب (ECG) خلال 10 دقائق، مع مراقبة العلامات الحيوية وسحب إنزيمات القلب (Troponin).
• اتبع بروتوكول متلازمة الشريان التاجي الحادة (ACS) ومسار القسطرة العلاجية وفق إرشادات ESC/AHA.
هذا تنبيه ثابت لأغراض السلامة ولا يغني عن الحكم الإكلينيكي للطبيب المعالج.`;

const EMERGENCY_PATTERNS: RegExp[] = [
  /ألم\s+(في\s+|ب)?ال?صدر/,
  /وجع\s+(في\s+)?(ال)?صدر/,
  /ضغط\s+على\s+الصدر/,
  /جلطة/,
  /احتشاء/,
  /نوبة\s+قلبية/,
  /سكتة\s+قلبية/,
  /أزمة\s+قلبية/,
  /توقف\s+(ال)?قلب/,
  /ارتفاع\s+(مقطع\s+)?(st|اس\s+تي)/i,
  /st[- ]?elevation/i,
  /\bstemi\b/i,
  /\bnstemi\b/i,
  /chest\s+pain/i,
  /heart\s+attack/i,
  /cardiac\s+arrest/i,
  /myocardial\s+infarction/i,
  /acute\s+coronary/i,
  /صدمة\s+قلبية/,
  /cardiogenic\s+shock/i,
];

function isEmergencyPresentation(text: string): boolean {
  const t = String(text || '');
  return EMERGENCY_PATTERNS.some((re) => re.test(t));
}

app.post('/api/chat', requireUser, async (req, res) => {
  const {
    history,
    message,
    patientContext,
    retrievedChunks = [],
    knowledgeSettings = {
      strictCardiologyOnly: true,
      strictKnowledgeOnly: true,
      requirePageCitation: true,
      minRelevanceScore: 0.25,
    },
    activeSourceCount = 0,
  } = req.body;

  const strictCardiology = knowledgeSettings?.strictCardiologyOnly !== false;
  const strictKnowledge = knowledgeSettings?.strictKnowledgeOnly !== false;
  const requireCitation = knowledgeSettings?.requirePageCitation !== false;

  const emergencyFlag = isEmergencyPresentation(String(message || ''));
  const withSafety = (text: string): string =>
    emergencyFlag ? `${EMERGENCY_SAFETY_LINE}\n\n---\n\n${text}` : text;

  // Guardrail 1: If Strict Knowledge Mode is enabled and NO files are uploaded/active
  if (strictKnowledge && activeSourceCount === 0) {
    return res.json({
      response: withSafety(
        '⛔ **وضع المصادر المعتمدة الحصري مفعّل، ولا توجد مراجع طبية مرفوعة حالياً.**\n\nيرجى من المشرف العام (Admin) التوجه إلى **لوحة الإدارة ← حوكمة الذكاء الاصطناعي ← مصادر المعرفة (Knowledge Base)** ورفع ملفات الـ PDF/المراجع القلبية المعتمدة أولاً ليتمكن المساعد من الإجابة بالدليل ورقم الصفحة.'
      ),
      citations: [],
      refused: true,
    });
  }

  // Guardrail 2: If Strict Knowledge Mode is enabled and NO chunks passed even minimal relevance
  const validChunks = Array.isArray(retrievedChunks) ? retrievedChunks : [];
  if (strictKnowledge && validChunks.length === 0) {
    return res.json({
      response: withSafety(
        '⛔ **عذراً، لم أجد دليلاً في المصادر الطبية المرفوعة يجيب على هذا السؤال.**\n\nأنا مقيد حالياً بالإجابة فقط عن **أمراض القلب** ومن **المصادر المعتمدة المرفوعة في لوحة الأدمن** بالدليل ورقم الصفحة.'
      ),
      citations: [],
      refused: true,
    });
  }

  try {
    const cleanHistory = Array.isArray(history)
      ? history.slice(-6).map((h: any) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(h?.parts?.[0]?.text || h?.text || '') }],
        }))
      : [];

    const hasUserAtEnd =
      cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user';
    const contents = hasUserAtEnd
      ? cleanHistory
      : [...cleanHistory, { role: 'user', parts: [{ text: String(message || '') }] }];

    const sourcesContextBlock =
      validChunks.length > 0
        ? validChunks
            .map(
              (c: any, idx: number) =>
                `[REFERENCE #${idx + 1}]\n- File Name: "${c.sourceTitle}"\n- Page Number: ${c.pageNumber}\n- Excerpt Text:\n"""\n${c.text}\n"""`
            )
            .join('\n\n')
        : 'NO UPLOADED SOURCES PROVIDED.';

    let systemInstruction = `You are "Cardios AI Clinical Assistant", a strictly scoped Cardiology Evidence Assistant embedded in the Cardios EHR platform.

================== STRICT OPERATIONAL RULES ==================
1. DOMAIN RESTRICTION (CARDIOLOGY & SOURCES ONLY):
${
  strictCardiology
    ? `- You ONLY answer questions directly related to **Cardiology (أمراض القلب والأوعية الدموية)**, cardiovascular medications/interactions, ECG/Echocardiography, cardiovascular labs, or the specific medical contents of the uploaded Reference Excerpts below.
- If the user asks about ANY topic outside Cardiology and outside the uploaded Reference Excerpts (e.g., cooking, coding, general trivia, sports, politics, weather, dermatology, orthopedics, casual conversation not about cardiology), you MUST REFUSE immediately by setting \`isOutOfScopeOrUnsupported: true\` and explaining politely in Arabic (or the user's language) that you only answer cardiology questions grounded in the approved medical references.`
    : `- Focus primarily on Cardiology and the uploaded medical references.`
}

2. SOURCE GROUNDING (NO OUTSIDE HALLUCINATION):
${
  strictKnowledge
    ? `- You MUST base your clinical/factual answer **STRICTLY and EXCLUSIVELY** on the [RETRIEVED REFERENCE EXCERPTS] provided below (plus the active patient's recorded numbers below ONLY when referencing that patient's own vitals/meds).
- Do NOT use general pre-trained medical knowledge if the fact is NOT supported by the retrieved reference excerpts below.
- If the [RETRIEVED REFERENCE EXCERPTS] do NOT contain enough evidence to answer the user's question, set \`isOutOfScopeOrUnsupported: true\`, leave \`citations\` empty, and reply clearly in Arabic: "عذراً، لم أجد دليلاً موثقاً في الصفحات المرفوعة من المصادر الطبية المعتمدة للإجابة على هذا السؤال."`
    : `- Prioritize the [RETRIEVED REFERENCE EXCERPTS] when answering.`
}

3. MANDATORY PAGE CITATIONS & EVIDENCE:
${
  requireCitation
    ? `- Every claim drawn from a reference MUST cite the exact **File Name** and exact **Page Number** as provided in the excerpt metadata (never invent or guess a page number!).
- In your \`answer\` text, explicitly mention the source and page number (e.g., \`(المصدر: اسم الملف — صفحة رقم X)\`) and quote/summarize the supporting evidence ("الدليل من المرجع: ...").
- Populate the \`citations\` JSON array with every reference excerpt you actually relied on, preserving the exact \`sourceTitle\` and integer \`pageNumber\` from the metadata.`
    : `- Cite sources when available.`
}

4. RESPONSE LANGUAGE & FORMAT:
- Respond in the same language as the user's question (Arabic or English).
- Be concise, accurate, and organized cleanly for physicians at the point of care.
==============================================================

================== [RETRIEVED REFERENCE EXCERPTS] ==================
${sourcesContextBlock}
==================================================================`;

    if (patientContext && patientContext.name) {
      systemInstruction += `\n\n================== ACTIVE PATIENT CLINICAL DOSSIER ==================
- Patient Name: ${patientContext.name}
- Patient ID: ${patientContext.id || 'N/A'}
- Age / DOB: ${patientContext.dob || 'Adult'}
- Primary Cardiovascular Diagnosis: ${patientContext.diagnosis || 'Cardiology evaluation'}
- Clinical Risk Tier: ${patientContext.riskTier || 'High Cardiovascular Risk'}
- Recent Blood Pressure & Heart Rate Log: ${JSON.stringify(patientContext.vitals || [])}
- Active Prescriptions & Medications: ${JSON.stringify(patientContext.medications || [])}
- Recent Laboratory Biomarkers: ${JSON.stringify(patientContext.labs || 'N/A')}
- Echocardiography Summary: ${JSON.stringify(patientContext.echo || 'N/A')}
======================================================================`;
    }

    if (!getApiKey()) {
      if (strictKnowledge) {
        return res.status(503).json({
          response:
            '⚠️ تعذر تشغيل محرك الذكاء الاصطناعي المعتمد على المصادر لعدم ضبط مفتاح `GEMINI_API_KEY` على الخادم.',
          citations: [],
          refused: true,
        });
      }
      return res.status(503).json({
        response: AI_UNAVAILABLE_MESSAGE,
        citations: [],
        refused: true,
      });
    }

    const responseSchemaConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isOutOfScopeOrUnsupported: {
            type: Type.BOOLEAN,
            description:
              'True if the user question is outside cardiology OR cannot be answered strictly from the provided reference excerpts.',
          },
          answer: {
            type: Type.STRING,
            description:
              'The formatted clinical response in the user language including inline evidence quotes and page citations, OR the polite refusal message if out of scope/unsupported.',
          },
          citations: {
            type: Type.ARRAY,
            description: 'List of exact source excerpts and page numbers used to construct the answer.',
            items: {
              type: Type.OBJECT,
              properties: {
                sourceTitle: {
                  type: Type.STRING,
                  description: 'Exact File Name from the reference metadata.',
                },
                pageNumber: {
                  type: Type.INTEGER,
                  description: 'Exact integer Page Number from the reference metadata.',
                },
                quote: {
                  type: Type.STRING,
                  description: 'Short exact evidence sentence or phrase from that page.',
                },
              },
              required: ['sourceTitle', 'pageNumber', 'quote'],
            },
          },
        },
        required: ['isOutOfScopeOrUnsupported', 'answer', 'citations'],
      },
    };

    let response: any;
    try {
      response = await Promise.race([
        getAiClient().models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: contents,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...responseSchemaConfig,
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Primary model timeout')), 14000)),
      ]);
    } catch (primaryErr: any) {
      console.warn('Primary gemini-4-hydrogen fallback to gemini-3.1-flash-lite:', primaryErr?.message || primaryErr);
      response = await Promise.race([
        getAiClient().models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contents,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            ...responseSchemaConfig,
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Secondary model timeout')), 14000)),
      ]);
    }

    const rawText = (response.text || '').trim();
    let parsed: {
      isOutOfScopeOrUnsupported?: boolean;
      answer?: string;
      citations?: { sourceTitle: string; pageNumber: number; quote: string }[];
    } = {};

    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        isOutOfScopeOrUnsupported: false,
        answer: rawText,
        citations: [],
      };
    }

    const refused = Boolean(parsed.isOutOfScopeOrUnsupported);
    const citations = refused ? [] : Array.isArray(parsed.citations) ? parsed.citations : [];

    return res.json({
      response: withSafety(
        parsed.answer || 'عذراً، لم أتمكن من استخراج إجابة موثقة من المصادر المرفوعة.'
      ),
      citations,
      refused,
    });
  } catch (e: any) {
    console.warn('Chat error:', e?.message || e);
    if (strictKnowledge) {
      // Deterministic grounded extractive fallback if upstream LLM times out
      const qLower = String(message || '').toLowerCase();
      const qWords = qLower.split(/\s+/).filter((w) => w.length >= 3);
      const matched = validChunks.filter((c: any) => {
        const txt = String(c.text || '').toLowerCase();
        return qWords.some((w) => txt.includes(w));
      });
      if (matched.length === 0) {
        return res.json({
          response: withSafety(
            '⛔ **عذراً، لم أجد دليلاً في المصادر الطبية المرفوعة يجيب على هذا السؤال.**\n\nأنا مقيد حالياً بالإجابة فقط عن **أمراض القلب** ومن **المصادر المعتمدة المرفوعة في لوحة الأدمن** بالدليل ورقم الصفحة.'
          ),
          citations: [],
          refused: true,
        });
      }
      const top = matched[0];
      return res.json({
        response: withSafety(
          `📄 **الدليل المباشر من المرجع (المصدر: ${top.sourceTitle} — صفحة ${top.pageNumber}):**\n\n"${String(top.text || '').slice(0, 500)}"`
        ),
        citations: [
          {
            sourceTitle: top.sourceTitle,
            pageNumber: Number(top.pageNumber) || 1,
            quote: String(top.text || '').slice(0, 240),
          },
        ],
        refused: false,
      });
    }
    return res.status(503).json({ response: AI_UNAVAILABLE_MESSAGE, citations: [], refused: true });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

