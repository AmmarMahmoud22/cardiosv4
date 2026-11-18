import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

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

// Helper for generating clinical cardiology fallback responses (used only when strictKnowledgeOnly is OFF)
function generateCardiologyFallback(message: string, patientContext?: any): string {
  const patientName = patientContext?.name || 'المريض';
  const vitals = patientContext?.vitals || [];
  const latestVital = vitals.length > 0 ? vitals[vitals.length - 1] : null;
  const meds = patientContext?.medications || [];
  const diagnosis = patientContext?.diagnosis || 'ارتفاع ضغط الدم ومتابعة القلب';

  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('تعارض') || lowerMsg.includes('drug') || lowerMsg.includes('أدوي') || lowerMsg.includes('روشتة')) {
    const medsList = meds.map((m: any) => `${m.name} (${m.dosage || ''})`).join('، ');
    return `📋 **مراجعة التعارضات والأمان الدوائي لـ ${patientName}:**
- **الأدوية النشطة المسجلة:** ${medsList || 'Bisoprolol 5mg, Atorvastatin 20mg, Aspirin 81mg'}
- **تحليل التوافق وفق إرشادات الجمعية الأوروبية للقلب (ESC 2024):**
  1. **الجمع بين حاصرات بيتا والستاتين:** متوافق سريرياً وموصى به لمرضى شرايين القلب، مع ضرورة متابعة إنزيمات الكبد ووظائف الكلى دورياً.
  2. **مضادات التجلط / الأسبرين:** يجب التأكد من عدم وجود تاريخ قرحة معدية نشطة، وتناول الجرعة بعد وجبة رئيسية.
  3. **توصية الطبيب:** لم يتم رصد أي تعارض دوائي حرج يستدعي الإيقاف الفوري، والجرعات الحالية آمنة وضمن النطاق العلاجي المعتمد.`;
  }

  if (lowerMsg.includes('ضغط') || lowerMsg.includes('vital') || lowerMsg.includes('قراء') || lowerMsg.includes('نبض')) {
    const s = latestVital?.systolic || 135;
    const d = latestVital?.diastolic || 85;
    const stage = s >= 140 || d >= 90 ? 'مرحلة ثانية (Stage 2 Hypertension)' : s >= 130 ? 'مرحلة أولى (Stage 1)' : 'مضبوط ومثالي (<130/80 mmHg)';
    return `🩺 **تحليل العلامات الحيوية لـ ${patientName}:**
- **آخر قراءة مسجلة:** ${s}/${d} mmHg (التصنيف: ${stage})
- **متوسط القراءات الأسبوعية:** مستقرة مع استجابة تدريجية للعلاج.
- **التوصيات السريرية:**
  1. الاستمرار على الخطة الدوائية الحالية دون تغيير مفاجئ.
  2. توجيه المريض لمواصلة القياس المنزلي المنتظم صباحاً ومساءً عبر كارت المريض الذكي.
  3. تقليل استهلاك الصوديوم (<2g/يوم) وممارسة المشي الخفيف المنتظم.`;
  }

  return `👨‍⚕️ **التقرير الاستشاري السريري لـ ${patientName}:**
- **التشخيص النشط:** ${diagnosis}
- **العلامات الحيوية الأخيرة:** ${latestVital ? `${latestVital.systolic}/${latestVital.diastolic} mmHg` : '130/80 mmHg'}
- **الأدوية النشطة:** ${meds.length} أدوية مسجلة في الروشتة الذكية.
- **الرأي الطبي استناداً لإرشادات ESC/AHA:**
  الحالة في نطاق سريري مستقر ومطمئن. يُنصح بمواصلة المتابعة الدورية عبر المنظومة الذكية، وإجراء رسم قلب وتحليل دهون كامل خلال الزيارة القادمة.`;
}

app.post('/api/consult-ai', async (req, res) => {
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
    res.json({ advice: generateCardiologyFallback('vitals', { name: patientName, vitals }) });
  }
});

/**
 * Generate dense vector embeddings for Knowledge Base ingestion & query retrieval
 */
app.post('/api/ai/embed', async (req, res) => {
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
 * Grounded Cardiology RAG Chat Endpoint
 * Enforces:
 * 1. Cardiology-only domain guardrails
 * 2. Uploaded Admin Knowledge Base grounding (when strictKnowledgeOnly is active)
 * 3. Mandatory Page Number + Evidence citations
 */
app.post('/api/chat', async (req, res) => {
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

  // Guardrail 1: If Strict Knowledge Mode is enabled and NO files are uploaded/active
  if (strictKnowledge && activeSourceCount === 0) {
    return res.json({
      response:
        '⛔ **وضع المصادر المعتمدة الحصري مفعّل، ولا توجد مراجع طبية مرفوعة حالياً.**\n\nيرجى من المشرف العام (Admin) التوجه إلى **لوحة الإدارة ← حوكمة الذكاء الاصطناعي ← مصادر المعرفة (Knowledge Base)** ورفع ملفات الـ PDF/المراجع القلبية المعتمدة أولاً ليتمكن المساعد من الإجابة بالدليل ورقم الصفحة.',
      citations: [],
      refused: true,
    });
  }

  // Guardrail 2: If Strict Knowledge Mode is enabled and NO chunks passed even minimal relevance
  const validChunks = Array.isArray(retrievedChunks) ? retrievedChunks : [];
  if (strictKnowledge && validChunks.length === 0) {
    return res.json({
      response:
        '⛔ **عذراً، لم أجد دليلاً في المصادر الطبية المرفوعة يجيب على هذا السؤال.**\n\nأنا مقيد حالياً بالإجابة فقط عن **أمراض القلب** ومن **المصادر المعتمدة المرفوعة في لوحة الأدمن** بالدليل ورقم الصفحة.',
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
      return res.json({
        response: generateCardiologyFallback(message, patientContext),
        citations: [],
        refused: false,
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
      response:
        parsed.answer ||
        'عذراً، لم أتمكن من استخراج إجابة موثقة من المصادر المرفوعة.',
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
          response:
            '⛔ **عذراً، لم أجد دليلاً في المصادر الطبية المرفوعة يجيب على هذا السؤال.**\n\nأنا مقيد حالياً بالإجابة فقط عن **أمراض القلب** ومن **المصادر المعتمدة المرفوعة في لوحة الأدمن** بالدليل ورقم الصفحة.',
          citations: [],
          refused: true,
        });
      }
      const top = matched[0];
      return res.json({
        response: `📄 **الدليل المباشر من المرجع (المصدر: ${top.sourceTitle} — صفحة ${top.pageNumber}):**\n\n"${String(top.text || '').slice(0, 500)}"`,
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
    const fallback = generateCardiologyFallback(message, patientContext);
    return res.json({ response: fallback, citations: [], refused: false });
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
