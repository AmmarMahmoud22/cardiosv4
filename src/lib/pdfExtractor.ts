import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker using bundled Vite asset URL (no external CDN dependency)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ChunkInput {
  pageNumber: number;
  chunkIndex: number;
  text: string;
}

const MAX_CHUNK_CHARS = 950;
const CHUNK_OVERLAP_CHARS = 150;

/**
 * Clean extracted PDF/text whitespace while preserving paragraph structure
 */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text page-by-page from a PDF File in the browser.
 * Preserves exact 1-based page numbers for every page.
 */
async function extractPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pages: ExtractedPage[] = [];
  const totalPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct reading order lines from text items
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== 'string') continue;
      const y = Array.isArray(item.transform) ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const cleaned = cleanText(lines.join('\n'));
    if (cleaned.length > 0) {
      pages.push({
        pageNumber: pageNum,
        text: cleaned
      });
    }

    if (onProgress) {
      onProgress(pageNum, totalPages);
    }
  }

  return pages;
}

/**
 * Extract pages from TXT / Markdown files.
 * Supports explicit form-feeds (\f) or "--- Page X ---" / "[Page X]" markers,
 * or creates logical ~2200-character pages if none exist.
 */
async function extractTextPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPage[]> {
  const rawText = await file.text();
  const normalized = rawText.replace(/\r\n/g, '\n');

  // Check if explicit page markers exist
  if (normalized.includes('\f')) {
    const rawPages = normalized.split('\f');
    const pages: ExtractedPage[] = [];
    rawPages.forEach((p, idx) => {
      const cleaned = cleanText(p);
      if (cleaned) pages.push({ pageNumber: idx + 1, text: cleaned });
    });
    if (onProgress) onProgress(pages.length, pages.length);
    return pages;
  }

  const pageMarkerRegex = /(?:^|\n)(?:---|===)?\s*(?:Page|صفحة|ص)\s*(\d+)\s*(?:---|===)?(?:\n|$)/gi;
  const matches = [...normalized.matchAll(pageMarkerRegex)];
  if (matches.length >= 2) {
    const pages: ExtractedPage[] = [];
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      const startIdx = (currentMatch.index ?? 0) + currentMatch[0].length;
      const endIdx = nextMatch ? (nextMatch.index ?? normalized.length) : normalized.length;
      const pageNum = parseInt(currentMatch[1], 10) || i + 1;
      const cleaned = cleanText(normalized.slice(startIdx, endIdx));
      if (cleaned) {
        pages.push({ pageNumber: pageNum, text: cleaned });
      }
    }
    if (onProgress) onProgress(pages.length, pages.length);
    return pages;
  }

  // Fallback: split into logical pages of ~2200 characters along paragraph boundaries
  const paragraphs = normalized.split(/\n\s*\n/);
  const pages: ExtractedPage[] = [];
  let buffer = '';
  let pageNum = 1;

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;
    if (buffer.length + p.length + 2 > 2200 && buffer.length > 0) {
      pages.push({ pageNumber: pageNum++, text: cleanText(buffer) });
      buffer = p;
    } else {
      buffer = buffer ? `${buffer}\n\n${p}` : p;
    }
  }
  if (buffer.trim()) {
    pages.push({ pageNumber: pageNum, text: cleanText(buffer) });
  }

  if (onProgress) onProgress(pages.length, pages.length);
  return pages;
}

/**
 * Split extracted pages into overlapping chunks while preserving exact pageNumber.
 */
export function chunkPages(pages: ExtractedPage[]): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let globalIdx = 0;

  for (const page of pages) {
    const text = page.text;
    if (!text) continue;

    if (text.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        pageNumber: page.pageNumber,
        chunkIndex: globalIdx++,
        text
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + MAX_CHUNK_CHARS, text.length);

      // Try to end cleanly on sentence or space boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const lastSpace = text.lastIndexOf(' ', end);
        const bestBreak = Math.max(lastPeriod, lastNewline);
        if (bestBreak > start + MAX_CHUNK_CHARS * 0.55) {
          end = bestBreak + 1;
        } else if (lastSpace > start + MAX_CHUNK_CHARS * 0.55) {
          end = lastSpace;
        }
      }

      const slice = text.slice(start, end).trim();
      if (slice.length > 0) {
        chunks.push({
          pageNumber: page.pageNumber,
          chunkIndex: globalIdx++,
          text: slice
        });
      }

      if (end >= text.length) break;
      start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
    }
  }

  return chunks;
}

/**
 * Main extractor entry point for PDF, TXT, MD files.
 */
export async function extractPagesFromFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ pages: ExtractedPage[]; chunks: ChunkInput[]; fileType: 'pdf' | 'txt' | 'md' }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    const pages = await extractPdfPages(file, onProgress);
    const chunks = chunkPages(pages);
    return { pages, chunks, fileType: 'pdf' };
  }

  const fileType: 'txt' | 'md' = ext === 'md' ? 'md' : 'txt';
  const pages = await extractTextPages(file, onProgress);
  const chunks = chunkPages(pages);
  return { pages, chunks, fileType };
}
