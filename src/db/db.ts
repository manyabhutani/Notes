import Dexie, { type Table } from 'dexie';

export interface Notebook {
  id?: number;
  title: string;
  coverColor: string;
  createdAt: number;
}

export interface Page {
  id?: number;
  notebookId: number;
  order: number;
  type: 'blank' | 'pdf';
  pdfBlob?: Blob;
  pdfPageNumber?: number;
}

export interface Annotation {
  id?: number;
  pageId: number;
  type: 'ink' | 'text' | 'sticky';
  content: string; // JSON string for ink paths or text content
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

export class LuminousDB extends Dexie {
  notebooks!: Table<Notebook>;
  pages!: Table<Page>;
  annotations!: Table<Annotation>;

  constructor() {
    super('LuminousNotebookDB');
    this.version(1).stores({
      notebooks: '++id, title, createdAt',
      pages: '++id, notebookId, order',
      annotations: '++id, pageId, type'
    });
  }
}

export const db = new LuminousDB();
