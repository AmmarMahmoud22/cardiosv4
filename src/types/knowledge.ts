export interface KnowledgeSource {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: 'pdf' | 'txt' | 'md';
  category: string;
  totalPages: number;
  totalChunks: number;
  isActive: boolean;
  uploadedAt: string;
  uploadedBy: string;
  hasEmbeddings: boolean;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  embedding?: number[];
}

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  pageNumber: number;
  text: string;
  score: number;
}

export interface KnowledgeSettings {
  strictCardiologyOnly: boolean;
  strictKnowledgeOnly: boolean;
  requirePageCitation: boolean;
  minRelevanceScore: number;
}

export interface CitationEvidence {
  sourceTitle: string;
  pageNumber: number;
  quote: string;
  score?: number;
}
