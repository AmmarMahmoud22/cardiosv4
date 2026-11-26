import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { extractPagesFromFile } from './pdfExtractor';
import {
  KnowledgeSource,
  KnowledgeChunk,
  KnowledgeSettings,
  RetrievedChunk
} from '../types/knowledge';
import { authedFetch } from './apiClient';

const SOURCES_COLLECTION = 'ai_knowledge_sources';
const CHUNKS_COLLECTION = 'ai_knowledge_chunks';
const SETTINGS_DOC_ID = 'ai_knowledge_settings';

const LOCAL_SOURCES_KEY = 'cardios_ai_kb_sources';
const LOCAL_CHUNKS_KEY = 'cardios_ai_kb_chunks';
const LOCAL_SETTINGS_KEY = 'cardios_ai_kb_settings';

export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  strictCardiologyOnly: true,
  strictKnowledgeOnly: true,
  requirePageCitation: true,
  minRelevanceScore: 0.25
};

export interface IngestionProgress {
  stage: 'extracting' | 'embedding' | 'saving' | 'done';
  message: string;
  current: number;
  total: number;
}

/**
 * Request dense semantic embeddings from our Express/Vercel backend (/api/ai/embed)
 */
export async function fetchEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (!texts.length) return [];
  try {
    const res = await authedFetch('/api/ai/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.embeddings) && data.embeddings.length === texts.length) {
      return data.embeddings;
    }
    return null;
  } catch (err) {
    console.warn('Embedding API unavailable, falling back to lexical retrieval:', err);
    return null;
  }
}

/**
 * For Arabic questions, ask the backend (Gemini) for an English translation plus keywords,
 * so retrieval can match English guideline text. Falls back to the original text on any failure.
 */
async function expandQueryToEnglish(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return '';
  try {
    const res = await authedFetch('/api/ai/expand-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data.english === 'string' ? data.english : '';
  } catch {
    return '';
  }
}

/**
 * Cosine similarity between two numeric vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Normalize Arabic and English text for lexical keyword matching boost
 */
const STOP_WORDS = new Set([
  'في', 'من', 'عن', 'علي', 'على', 'الي', 'إلى', 'او', 'أو', 'ان', 'إن', 'هل', 'ما', 'هو', 'هي', 'كم', 'كيف', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
  'in', 'on', 'at', 'to', 'of', 'is', 'it', 'or', 'an', 'as', 'by', 'for', 'the', 'and', 'how', 'what', 'why', 'with'
]);

function tokenizeText(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // strip Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return normalized
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function computeLexicalScore(queryTokens: string[], chunkText: string): number {
  if (queryTokens.length === 0) return 0;
  const chunkTokens = new Set(tokenizeText(chunkText));
  if (chunkTokens.size === 0) return 0;

  let hits = 0;
  for (const qt of queryTokens) {
    if (chunkTokens.has(qt)) {
      hits += 1;
    } else {
      // Partial stem/prefix match for medical terms
      for (const ct of chunkTokens) {
        if (ct.length >= 4 && qt.length >= 4 && (ct.includes(qt) || qt.includes(ct))) {
          hits += 0.6;
          break;
        }
      }
    }
  }
  return Math.min(1, hits / Math.max(1, Math.min(queryTokens.length, 6)));
}

/**
 * Firestore rules only allow these source fields:
 * id, title, category, fileName, fileSize, pageCount, chunkCount, isActive, uploadedBy, createdAt.
 * Map the app model to that shape on write and back on read.
 */
function sourceToFirestore(src: KnowledgeSource) {
  return {
    id: src.id,
    title: src.title.slice(0, 300),
    category: String(src.category || '').slice(0, 100),
    fileName: String(src.fileName || '').slice(0, 255),
    fileSize: src.fileSize,
    pageCount: src.totalPages,
    chunkCount: src.totalChunks,
    isActive: src.isActive,
    uploadedBy: String(src.uploadedBy || '').slice(0, 200),
    createdAt: src.uploadedAt
  };
}

function sourceFromFirestore(id: string, data: any): KnowledgeSource {
  const ext = String(data.fileName || '').split('.').pop()?.toLowerCase();
  const fileType = ext === 'txt' || ext === 'md' ? ext : 'pdf';
  return {
    id,
    title: data.title || '',
    fileName: data.fileName || '',
    fileSize: data.fileSize || 0,
    fileType,
    category: data.category || '',
    totalPages: data.totalPages ?? data.pageCount ?? 0,
    totalChunks: data.totalChunks ?? data.chunkCount ?? 0,
    isActive: data.isActive === true,
    uploadedAt: data.uploadedAt || data.createdAt || '',
    uploadedBy: data.uploadedBy || '',
    hasEmbeddings: data.hasEmbeddings === true
  } as KnowledgeSource;
}

// Local storage helpers as resilient cache
function getLocalSources(): KnowledgeSource[] {
  try {
    const raw = localStorage.getItem(LOCAL_SOURCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalSources(sources: KnowledgeSource[]) {
  try {
    localStorage.setItem(LOCAL_SOURCES_KEY, JSON.stringify(sources));
  } catch (e) {
    console.warn('localStorage sources save skipped:', e);
  }
}

function getLocalChunks(): KnowledgeChunk[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHUNKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalChunks(chunks: KnowledgeChunk[]) {
  try {
    // Store without huge embeddings if near quota
    localStorage.setItem(LOCAL_CHUNKS_KEY, JSON.stringify(chunks));
  } catch {
    try {
      const stripped = chunks.map(({ embedding: _emb, ...rest }) => rest);
      localStorage.setItem(LOCAL_CHUNKS_KEY, JSON.stringify(stripped));
    } catch (e) {
      console.warn('localStorage chunks save skipped:', e);
    }
  }
}

/**
 * Subscribe to Knowledge Sources in real time
 */
export function subscribeToKnowledgeSources(
  callback: (sources: KnowledgeSource[]) => void,
  activeOnly = false
): () => void {
  const local = getLocalSources();
  if (local.length > 0) callback(local);

  try {
    const unsub = onSnapshot(
      activeOnly
        ? query(collection(db, SOURCES_COLLECTION), where('isActive', '==', true))
        : collection(db, SOURCES_COLLECTION),
      (snap) => {
        const list: KnowledgeSource[] = [];
        snap.forEach((docSnap) => {
          list.push(sourceFromFirestore(docSnap.id, docSnap.data()));
        });
        list.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
        saveLocalSources(list);
        callback(list);
      },
      (err) => {
        console.warn('Firestore knowledge sources listener fallback:', err);
        callback(getLocalSources());
      }
    );
    return unsub;
  } catch {
    callback(getLocalSources());
    return () => {};
  }
}

/**
 * Load & save Admin AI Grounding Settings
 */
export async function getKnowledgeSettings(): Promise<KnowledgeSettings> {
  try {
    const snap = await getDoc(doc(db, 'system_config', SETTINGS_DOC_ID));
    if (snap.exists()) {
      const merged = { ...DEFAULT_KNOWLEDGE_SETTINGS, ...(snap.data() as Partial<KnowledgeSettings>) };
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (e) {
    console.warn('Firestore settings read fallback:', e);
  }

  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_KNOWLEDGE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_KNOWLEDGE_SETTINGS;
}

export async function saveKnowledgeSettings(settings: KnowledgeSettings): Promise<void> {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
  await setDoc(doc(db, 'system_config', SETTINGS_DOC_ID), settings, { merge: true }).catch((err) => {
    console.warn('Firestore settings save fallback:', err);
  });
}

/**
 * Ingest a PDF/TXT/MD file into the AI Knowledge Base with exact page numbers and embeddings.
 */
export async function ingestKnowledgeFile(
  file: File,
  options: { title?: string; category?: string; uploadedBy?: string },
  onProgress?: (progress: IngestionProgress) => void
): Promise<KnowledgeSource> {
  const sourceId = `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sourceTitle = (options.title || file.name).trim();
  const category = options.category || 'إرشادات أمراض القلب (ESC / AHA)';
  const uploadedBy = options.uploadedBy || 'Super Admin';

  onProgress?.({
    stage: 'extracting',
    message: 'جاري قراءة الملف واستخراج النصوص صفحة بصفحة...',
    current: 0,
    total: 1
  });

  const { pages, chunks: rawChunks, fileType } = await extractPagesFromFile(
    file,
    (curr, total) => {
      onProgress?.({
        stage: 'extracting',
        message: `جاري استخراج صفحة ${curr} من ${total}...`,
        current: curr,
        total
      });
    }
  );

  if (rawChunks.length === 0) {
    throw new Error(
      'لم يتم العثور على نص قابل للقراءة داخل هذا الملف. يرجى التأكد أن ملف الـ PDF نصي (وليس صوراً ممسوحة ضوئياً بدون OCR).'
    );
  }

  // Generate semantic embeddings in batches of 12
  const BATCH_SIZE = 12;
  const allEmbeddings: (number[] | undefined)[] = new Array(rawChunks.length).fill(undefined);
  let hasEmbeddings = false;

  for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
    const slice = rawChunks.slice(i, i + BATCH_SIZE);
    onProgress?.({
      stage: 'embedding',
      message: `جاري الفهرسة الدلالية بالذكاء الاصطناعي (${Math.min(i + BATCH_SIZE, rawChunks.length)} / ${rawChunks.length} مقطع)...`,
      current: Math.min(i + BATCH_SIZE, rawChunks.length),
      total: rawChunks.length
    });

    const vectors = await fetchEmbeddings(slice.map((c) => c.text));
    if (vectors && vectors.length === slice.length) {
      hasEmbeddings = true;
      vectors.forEach((vec, idx) => {
        allEmbeddings[i + idx] = vec;
      });
    }
  }

  const chunkDocs: KnowledgeChunk[] = rawChunks.map((c, idx) => ({
    id: `${sourceId}_p${c.pageNumber}_c${c.chunkIndex}`,
    sourceId,
    sourceTitle,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    text: c.text,
    ...(allEmbeddings[idx] ? { embedding: allEmbeddings[idx] } : {})
  }));

  const sourceDoc: KnowledgeSource = {
    id: sourceId,
    title: sourceTitle,
    fileName: file.name,
    fileSize: file.size,
    fileType,
    category,
    totalPages: pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) : 1,
    totalChunks: chunkDocs.length,
    isActive: true,
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    hasEmbeddings
  };

  onProgress?.({
    stage: 'saving',
    message: `جاري حفظ ${chunkDocs.length} مقطع مرجعي في قاعدة البيانات...`,
    current: 0,
    total: chunkDocs.length
  });

  // Save locally immediately for resilience
  const existingSources = getLocalSources();
  saveLocalSources([sourceDoc, ...existingSources]);
  const existingChunks = getLocalChunks();
  saveLocalChunks([...chunkDocs, ...existingChunks]);

  // Persist to Firestore in batches. Failures must be visible to the admin (never silent).
  try {
    await setDoc(doc(db, SOURCES_COLLECTION, sourceId), sourceToFirestore(sourceDoc));

    const FIRESTORE_BATCH_LIMIT = 80;
    for (let i = 0; i < chunkDocs.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(db);
      const slice = chunkDocs.slice(i, i + FIRESTORE_BATCH_LIMIT);
      slice.forEach((chunk) => {
        batch.set(doc(db, CHUNKS_COLLECTION, chunk.id), chunk);
      });
      await batch.commit();
      onProgress?.({
        stage: 'saving',
        message: `تم حفظ ${Math.min(i + FIRESTORE_BATCH_LIMIT, chunkDocs.length)} من ${chunkDocs.length} مقطع...`,
        current: Math.min(i + FIRESTORE_BATCH_LIMIT, chunkDocs.length),
        total: chunkDocs.length
      });
    }
  } catch (err: any) {
    console.error('Knowledge base save to Firestore FAILED:', err);
    // Roll back the local cache so the UI does not show a source that was never saved.
    saveLocalSources(getLocalSources().filter((s) => s.id !== sourceId));
    saveLocalChunks(getLocalChunks().filter((c) => c.sourceId !== sourceId));
    throw new Error(
      `فشل حفظ المرجع في قاعدة البيانات / Failed to save to database: ${err?.code || ''} ${err?.message || err}`.trim()
    );
  }

  onProgress?.({
    stage: 'done',
    message: `تمت إضافة المرجع بنجاح (${sourceDoc.totalPages} صفحة / ${chunkDocs.length} مقطع)!`,
    current: chunkDocs.length,
    total: chunkDocs.length
  });

  return sourceDoc;
}

/**
 * Toggle whether a source is currently active for AI retrieval
 */
export async function toggleKnowledgeSourceActive(source: KnowledgeSource): Promise<void> {
  const nextActive = !source.isActive;
  const updated = getLocalSources().map((s) =>
    s.id === source.id ? { ...s, isActive: nextActive } : s
  );
  saveLocalSources(updated);

  await setDoc(doc(db, SOURCES_COLLECTION, source.id), { isActive: nextActive }, { merge: true });
}

/**
 * Delete a source and all its indexed page chunks
 */
export async function deleteKnowledgeSource(sourceId: string): Promise<void> {
  saveLocalSources(getLocalSources().filter((s) => s.id !== sourceId));
  saveLocalChunks(getLocalChunks().filter((c) => c.sourceId !== sourceId));

  try {
    await deleteDoc(doc(db, SOURCES_COLLECTION, sourceId));
    const q = query(collection(db, CHUNKS_COLLECTION), where('sourceId', '==', sourceId));
    const snap = await getDocs(q);

    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 100) {
      const batch = writeBatch(db);
      docs.slice(i, i + 100).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Error deleting source from Firestore:', err);
  }
}

/**
 * Load all chunks belonging to a specific source (for Admin Page Inspector)
 */
export async function getSourceChunks(sourceId: string): Promise<KnowledgeChunk[]> {
  try {
    const q = query(collection(db, CHUNKS_COLLECTION), where('sourceId', '==', sourceId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as KnowledgeChunk));
      items.sort((a, b) => a.pageNumber - b.pageNumber || a.chunkIndex - b.chunkIndex);
      return items;
    }
  } catch (err) {
    console.warn('Firestore source chunks fallback:', err);
  }
  return getLocalChunks()
    .filter((c) => c.sourceId === sourceId)
    .sort((a, b) => a.pageNumber - b.pageNumber || a.chunkIndex - b.chunkIndex);
}

/**
 * Load all active chunks across active sources for hybrid RAG retrieval
 */
async function loadActiveKnowledgeData(): Promise<{
  activeSources: KnowledgeSource[];
  activeChunks: KnowledgeChunk[];
}> {
  let sources: KnowledgeSource[] = [];
  let chunks: KnowledgeChunk[] = [];

  try {
    // Constrained query: rules only allow listing sources with isActive == true for non-admins.
    const sSnap = await getDocs(query(collection(db, SOURCES_COLLECTION), where('isActive', '==', true)));
    sources = sSnap.docs.map((d) => sourceFromFirestore(d.id, d.data()));
  } catch (e) {
    console.warn('Knowledge sources read failed:', e);
    sources = getLocalSources();
  }

  const activeSources = sources.filter((s) => s.isActive);
  if (activeSources.length === 0) {
    return { activeSources: [], activeChunks: [] };
  }

  const activeIds = new Set(activeSources.map((s) => s.id));

  try {
    // One constrained query per active source (rules need a sourceId constraint).
    const results = await Promise.all(
      activeSources.map((s) =>
        getDocs(query(collection(db, CHUNKS_COLLECTION), where('sourceId', '==', s.id)))
      )
    );
    chunks = results
      .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as KnowledgeChunk)))
      .filter((c) => activeIds.has(c.sourceId));
  } catch (e) {
    console.warn('Knowledge chunks read failed:', e);
    chunks = getLocalChunks().filter((c) => activeIds.has(c.sourceId));
  }

  return { activeSources, activeChunks: chunks };
}

/**
 * Hybrid Semantic + Lexical Retrieval across uploaded Admin PDF/TXT sources.
 * Returns top-K most relevant excerpts with exact page numbers.
 */
export async function retrieveRelevantChunks(
  queryText: string,
  topK = 7
): Promise<{
  chunks: RetrievedChunk[];
  activeSourceCount: number;
  totalChunkCount: number;
}> {
  const [{ activeSources, activeChunks }, englishQuery] = await Promise.all([
    loadActiveKnowledgeData(),
    expandQueryToEnglish(queryText)
  ]);
  const searchText = englishQuery ? `${queryText} ${englishQuery}` : queryText;

  if (activeSources.length === 0 || activeChunks.length === 0) {
    return {
      chunks: [],
      activeSourceCount: activeSources.length,
      totalChunkCount: activeChunks.length
    };
  }

  // Compute query embedding if chunks have embeddings
  const chunksWithEmbeddings = activeChunks.some((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
  let queryEmbedding: number[] | null = null;

  if (chunksWithEmbeddings) {
    const res = await fetchEmbeddings([englishQuery || queryText]);
    if (res && res[0]) {
      queryEmbedding = res[0];
    }
  }

  const queryTokens = tokenizeText(searchText);

  const scored: RetrievedChunk[] = activeChunks.map((chunk) => {
    const lexicalScore = computeLexicalScore(queryTokens, chunk.text);
    let semanticScore = 0;

    if (queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length === queryEmbedding.length) {
      semanticScore = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));
    }

    // Hybrid blend: semantic embeddings handle cross-lingual Arabic<->English queries seamlessly,
    // while lexical boost prioritizes exact drug names, guideline acronyms, and numbers.
    const finalScore =
      queryEmbedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0
        ? semanticScore * 0.78 + lexicalScore * 0.22
        : lexicalScore;

    return {
      id: chunk.id,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      pageNumber: chunk.pageNumber,
      text: chunk.text,
      score: Number(finalScore.toFixed(4))
    };
  });

  const hasAnyEmbeddings = Boolean(queryEmbedding);
  const relevant = scored.filter((c) => c.score >= (hasAnyEmbeddings ? 0.34 : 0.08));
  relevant.sort((a, b) => b.score - a.score);

  return {
    chunks: relevant.slice(0, topK),
    activeSourceCount: activeSources.length,
    totalChunkCount: activeChunks.length
  };
}



