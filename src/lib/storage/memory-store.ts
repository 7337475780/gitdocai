import { GeneratedDocument } from '../documentation/readme-generator';

class MemoryStore {
  private documents: Map<string, GeneratedDocument> = new Map();

  saveDocument(doc: GeneratedDocument): void {
    this.documents.set(doc.id, doc);
  }

  getDocument(id: string): GeneratedDocument | undefined {
    return this.documents.get(id);
  }

  updateDocument(id: string, updates: Partial<GeneratedDocument>): GeneratedDocument | undefined {
    const existing = this.documents.get(id);
    if (!existing) return undefined;
    
    // We only shallow merge the top-level properties.
    const updated = { ...existing, ...updates };
    
    // For metadata and quality, if they are provided, we should merge them deeply 
    // or completely overwrite them depending on the use case. Overwrite is safer for regeneration.
    this.documents.set(id, updated);
    return updated;
  }

  deleteDocument(id: string): boolean {
    return this.documents.delete(id);
  }
}

export const documentStore = new MemoryStore();
