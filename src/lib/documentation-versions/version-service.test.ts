import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VersionService } from './version-service';
import { prisma } from '../database/prisma';
import { calculateContentHash } from './version-hash';

// Mock prisma client
vi.mock('../database/prisma', () => {
  const mockTx = {
    documentationVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    documentation: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    repositoryAnalysis: {
      findUnique: vi.fn()
    }
  };

  return {
    prisma: {
      ...mockTx,
      $transaction: vi.fn((cb) => cb(mockTx))
    }
  };
});

describe('VersionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateContentHash', () => {
    it('should normalize carriage returns and trailing whitespace', () => {
      const normal = '# Hello\nThis is text.';
      const carriage = '# Hello\r\nThis is text.  \n';
      expect(calculateContentHash(normal)).toBe(calculateContentHash(carriage));
    });

    it('should be deterministic', () => {
      const txt = 'Deterministic test';
      expect(calculateContentHash(txt)).toBe(calculateContentHash(txt));
    });
  });

  describe('ensureDocumentHasVersions', () => {
    it('should create Version 1 if no versions exist (idempotent backfill)', async () => {
      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(0);
      vi.mocked(prisma.documentation.findUnique).mockResolvedValue({
        id: 'doc-123',
        markdown: '# Initial Document',
        sections: [],
        metadata: {},
        qualityScore: 90,
        qualityData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      await VersionService.ensureDocumentHasVersions('doc-123');

      expect(prisma.documentationVersion.count).toHaveBeenCalledWith({
        where: { documentId: 'doc-123' }
      });
      expect(prisma.documentationVersion.create).toHaveBeenCalled();
    });

    it('should do nothing if versions already exist', async () => {
      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(3);

      await VersionService.ensureDocumentHasVersions('doc-123');

      expect(prisma.documentationVersion.count).toHaveBeenCalledWith({
        where: { documentId: 'doc-123' }
      });
      expect(prisma.documentationVersion.create).not.toHaveBeenCalled();
    });
  });

  describe('createVersion', () => {
    it('should allocate version numbers sequentially per document', async () => {
      // Setup mock transaction environment
      const tx = (prisma.$transaction as any).mock.results[0]?.value || prisma;
      
      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(1);
      vi.mocked(tx.documentationVersion.findFirst).mockResolvedValue({
        versionNumber: 4,
        contentHash: 'some-old-hash'
      } as any);
      vi.mocked(tx.documentationVersion.create).mockImplementation((args: any) => Promise.resolve(args.data));

      const result = await VersionService.createVersion({
        documentId: 'doc-123',
        markdown: '# New markdown text content',
        sourceType: 'MANUAL_EDIT'
      });

      expect(result).toBeDefined();
      expect(result?.versionNumber).toBe(5);
    });

    it('should not create a version if content hash is identical to latest', async () => {
      const tx = (prisma.$transaction as any).mock.results[0]?.value || prisma;
      const sameMarkdown = '# Test duplicate';
      const sameHash = calculateContentHash(sameMarkdown);

      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(1);
      vi.mocked(tx.documentationVersion.findFirst).mockResolvedValue({
        versionNumber: 1,
        contentHash: sameHash
      } as any);

      const result = await VersionService.createVersion({
        documentId: 'doc-123',
        markdown: sameMarkdown,
        sourceType: 'MANUAL_EDIT'
      });

      expect(result).toBeNull();
      expect(tx.documentationVersion.create).not.toHaveBeenCalled();
    });
  });

  describe('compareVersions', () => {
    it('should correctly detect added, removed, modified, and unchanged sections', async () => {
      const baseMarkdown = '# Title\n\n## Section A\nBase content A\n\n## Section B\nBase content B';
      const compareMarkdown = '# Title\n\n## Section A\nBase content A\n\n## Section B\nModified content B\n\n## Section C\nAdded content C';

      vi.mocked(prisma.documentationVersion.findUnique)
        .mockResolvedValueOnce({
          id: 'v1',
          documentId: 'doc-123',
          versionNumber: 1,
          markdown: baseMarkdown,
          sections: null
        } as any)
        .mockResolvedValueOnce({
          id: 'v2',
          documentId: 'doc-123',
          versionNumber: 2,
          markdown: compareMarkdown,
          sections: null
        } as any);

      const diff = await VersionService.compareVersions({
        documentId: 'doc-123',
        baseVersionId: 'v1',
        compareVersionId: 'v2'
      });

      expect(diff.summary.changedSections).toBe(2); // Section B (modified), Section C (added)
      
      const secB = diff.changes.find(c => c.section === 'Section B');
      expect(secB?.type).toBe('modified');
      expect(secB?.before).toContain('Base content B');
      expect(secB?.after).toContain('Modified content B');

      const secC = diff.changes.find(c => c.section === 'Section C');
      expect(secC?.type).toBe('added');
    });
  });

  describe('restoreVersion', () => {
    it('should throw conflict error if active document changed since review', async () => {
      const currentDoc = {
        id: 'doc-123',
        markdown: '# Current Active State (edited recently)',
        updatedAt: new Date('2026-08-01T10:00:00.000Z')
      };

      const targetVersion = {
        id: 'v2',
        documentId: 'doc-123',
        versionNumber: 2,
        markdown: '# Target State to Restore',
        contentHash: 'hash-v2'
      };

      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(1);
      
      const tx = (prisma.$transaction as any).mock.results[0]?.value || prisma;
      vi.mocked(tx.documentation.findUnique).mockResolvedValue(currentDoc as any);
      vi.mocked(tx.documentationVersion.findUnique).mockResolvedValue(targetVersion as any);

      await expect(
        VersionService.restoreVersion({
          documentId: 'doc-123',
          versionId: 'v2',
          expectedUpdatedAt: new Date('2026-08-01T09:00:00.000Z').toISOString() // Different timestamp
        })
      ).rejects.toThrow('DOCUMENT_CHANGED_SINCE_VERSION_VIEW');
    });

    it('should successfully restore an older version, creating a new RESTORE marker snapshot', async () => {
      const currentDoc = {
        id: 'doc-123',
        markdown: '# Current Active State',
        sections: [],
        metadata: {},
        qualityScore: 90,
        qualityData: {},
        repositoryAnalysisId: 'analysis-123',
        updatedAt: new Date('2026-08-01T10:00:00.000Z')
      };

      const targetVersion = {
        id: 'v2',
        documentId: 'doc-123',
        versionNumber: 2,
        markdown: '# Target Restored State',
        sections: [],
        metadata: {},
        contentHash: 'hash-target-v2'
      };

      vi.mocked(prisma.documentationVersion.count).mockResolvedValue(1);
      
      const tx = (prisma.$transaction as any).mock.results[0]?.value || prisma;
      vi.mocked(tx.documentation.findUnique).mockResolvedValue(currentDoc as any);
      vi.mocked(tx.documentationVersion.findUnique).mockResolvedValue(targetVersion as any);
      vi.mocked(tx.repositoryAnalysis.findUnique).mockResolvedValue({
        analysisData: JSON.stringify({ projectType: 'frontend' })
      } as any);

      vi.mocked(tx.documentationVersion.findFirst).mockResolvedValue({
        versionNumber: 3,
        contentHash: 'hash-v3'
      } as any);

      vi.mocked(tx.documentation.update).mockImplementation((args: any) => Promise.resolve({
        id: 'doc-123',
        ...args.data
      }));

      vi.mocked(tx.documentationVersion.create).mockImplementation((args: any) => Promise.resolve(args.data));

      const result = await VersionService.restoreVersion({
        documentId: 'doc-123',
        versionId: 'v2',
        expectedUpdatedAt: currentDoc.updatedAt.toISOString()
      });

      expect(result.document.markdown).toBe('# Target Restored State');
      expect(result.version.sourceType).toBe('RESTORE');
      expect(result.version.versionNumber).toBe(5); // latest (3) + snapshot of current (4) + restored (5)
    });
  });
});
