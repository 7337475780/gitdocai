import { prisma } from '../database/prisma';
import { DocumentationVersionSource, DocumentationVersion } from '@prisma/client';
import { calculateContentHash } from './version-hash';
import { compareVersions } from './version-diff';
import { VersionListResponse, VersionSummary, VersionDetail, VersionComparisonResult } from './version-types';
import { QualityEngine } from '../documentation-quality/quality-engine';

export class VersionService {
  /**
   * Lazily ensures that a document has at least Version 1 backfilled if it is unversioned.
   * This guarantees idempotency and prevents null checks on existing DB records.
   */
  static async ensureDocumentHasVersions(documentId: string): Promise<void> {
    const count = await prisma.documentationVersion.count({
      where: { documentId }
    });
    
    if (count === 0) {
      const doc = await prisma.documentation.findUnique({
        where: { id: documentId }
      });
      
      if (doc) {
        const hash = calculateContentHash(doc.markdown);
        await prisma.documentationVersion.create({
          data: {
            documentId,
            versionNumber: 1,
            markdown: doc.markdown,
            contentHash: hash,
            sections: doc.sections || undefined,
            metadata: doc.metadata || undefined,
            qualityScore: doc.qualityScore,
            qualityData: doc.qualityData || undefined,
            sourceType: 'INITIAL_GENERATION',
            sourceLabel: 'Initial AI generation',
            createdAt: doc.createdAt // Align with creation date
          }
        });
      }
    }
  }

  /**
   * Idempotent batch backfill for all existing documentation records.
   */
  static async backfillAll(): Promise<number> {
    const docs = await prisma.documentation.findMany({
      where: {
        versions: {
          none: {}
        }
      }
    });

    let count = 0;
    for (const doc of docs) {
      try {
        const hash = calculateContentHash(doc.markdown);
        await prisma.documentationVersion.create({
          data: {
            documentId: doc.id,
            versionNumber: 1,
            markdown: doc.markdown,
            contentHash: hash,
            sections: doc.sections || undefined,
            metadata: doc.metadata || undefined,
            qualityScore: doc.qualityScore,
            qualityData: doc.qualityData || undefined,
            sourceType: 'INITIAL_GENERATION',
            sourceLabel: 'Initial AI generation',
            createdAt: doc.createdAt
          }
        });
        count++;
      } catch (err) {
        console.error(`Error backfilling doc ${doc.id}:`, err);
      }
    }
    return count;
  }

  /**
   * Create a new documentation version if the content has changed since the latest version.
   * Uses a transaction to safely assign incrementing version numbers.
   */
  static async createVersion(params: {
    documentId: string;
    markdown: string;
    sections?: any;
    metadata?: any;
    qualityScore?: number | null;
    qualityData?: any;
    sourceType: DocumentationVersionSource;
    sourceLabel?: string;
    baselineSnapshotId?: string | null;
    baselineUpdatedAt?: Date | null;
  }): Promise<DocumentationVersion | null> {
    const { documentId, markdown, sections, sourceType, sourceLabel, baselineSnapshotId, baselineUpdatedAt } = params;

    // Validate size limit (50k characters)
    if (markdown.length > 50000) {
      throw new Error('VERSION_CONTENT_INVALID');
    }

    // Ensure document has versions (lazy backfill)
    await this.ensureDocumentHasVersions(documentId);

    const contentHash = calculateContentHash(markdown);

    return await prisma.$transaction(async (tx) => {
      // Find latest version to check duplicates
      const latest = await tx.documentationVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: 'desc' }
      });

      if (latest && latest.contentHash === contentHash) {
        // Content did not change, ignore creation
        return null;
      }

      const nextNumber = latest ? latest.versionNumber + 1 : 1;

      // Extract quality values from parameters or fallback to active document quality
      let finalQualityScore = params.qualityScore;
      let finalQualityData = params.qualityData;
      if (finalQualityScore === undefined && finalQualityData === undefined) {
        const doc = await tx.documentation.findUnique({
          where: { id: documentId },
          select: { qualityScore: true, qualityData: true }
        });
        if (doc) {
          finalQualityScore = doc.qualityScore;
          finalQualityData = doc.qualityData;
        }
      }

      return await tx.documentationVersion.create({
        data: {
          documentId,
          versionNumber: nextNumber,
          markdown,
          contentHash,
          sections: sections || undefined,
          metadata: params.metadata || undefined,
          qualityScore: finalQualityScore,
          qualityData: finalQualityData || undefined,
          sourceType,
          sourceLabel: sourceLabel || this.getDefaultSourceLabel(sourceType, nextNumber),
          baselineSnapshotId: baselineSnapshotId || undefined,
          baselineUpdatedAt: baselineUpdatedAt || undefined,
        }
      });
    });
  }

  /**
   * Retrieves lightweight version list (paginated, latest first).
   */
  static async getVersionHistory(params: {
    documentId: string;
    page: number;
    perPage: number;
  }): Promise<VersionListResponse> {
    const { documentId, page, perPage } = params;

    // Ensure backfill has run
    await this.ensureDocumentHasVersions(documentId);

    const skip = (page - 1) * perPage;

    // Fetch in transaction to ensure consistency
    const [versions, totalCount, activeDoc] = await prisma.$transaction([
      prisma.documentationVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true,
          versionNumber: true,
          sourceType: true,
          sourceLabel: true,
          qualityScore: true,
          createdAt: true,
          contentHash: true
        }
      }),
      prisma.documentationVersion.count({
        where: { documentId }
      }),
      prisma.documentation.findUnique({
        where: { id: documentId },
        select: { markdown: true }
      })
    ]);

    if (!activeDoc) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    const currentHash = calculateContentHash(activeDoc.markdown);

    const mappedVersions: VersionSummary[] = versions.map(v => ({
      versionId: v.id,
      versionNumber: v.versionNumber,
      sourceType: v.sourceType,
      sourceLabel: v.sourceLabel,
      qualityScore: v.qualityScore,
      createdAt: v.createdAt.toISOString(),
      isCurrent: v.contentHash === currentHash
    }));

    return {
      versions: mappedVersions,
      page,
      hasNextPage: skip + versions.length < totalCount
    };
  }

  /**
   * Retrieves full details of a specific version.
   */
  static async getVersion(documentId: string, versionId: string): Promise<VersionDetail> {
    const version = await prisma.documentationVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) {
      throw new Error('DOCUMENT_VERSION_NOT_FOUND');
    }

    if (version.documentId !== documentId) {
      throw new Error('DOCUMENT_VERSION_MISMATCH');
    }

    return {
      versionId: version.id,
      versionNumber: version.versionNumber,
      markdown: version.markdown,
      sections: version.sections,
      metadata: version.metadata,
      qualityScore: version.qualityScore,
      qualityData: version.qualityData,
      sourceType: version.sourceType,
      sourceLabel: version.sourceLabel,
      createdAt: version.createdAt.toISOString()
    };
  }

  /**
   * Compares two versions and returns difference metrics.
   */
  static async compareVersions(params: {
    documentId: string;
    baseVersionId: string;
    compareVersionId: string;
  }): Promise<VersionComparisonResult> {
    const { documentId, baseVersionId, compareVersionId } = params;

    let base: any = null;
    let comp: any = null;

    if (baseVersionId === 'current' || compareVersionId === 'current') {
      const doc = await prisma.documentation.findUnique({
        where: { id: documentId }
      });
      if (!doc) {
        throw new Error('DOCUMENT_NOT_FOUND');
      }
      
      const latest = await prisma.documentationVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      });
      const currentVerNum = (latest?.versionNumber || 1) + 1;

      const currentRecord = {
        id: 'current',
        documentId,
        versionNumber: currentVerNum,
        markdown: doc.markdown,
        sections: doc.sections
      };

      if (baseVersionId === 'current') {
        base = currentRecord;
      } else {
        base = await prisma.documentationVersion.findUnique({ where: { id: baseVersionId } });
      }

      if (compareVersionId === 'current') {
        comp = currentRecord;
      } else {
        comp = await prisma.documentationVersion.findUnique({ where: { id: compareVersionId } });
      }
    } else {
      const [b, c] = await Promise.all([
        prisma.documentationVersion.findUnique({ where: { id: baseVersionId } }),
        prisma.documentationVersion.findUnique({ where: { id: compareVersionId } })
      ]);
      base = b;
      comp = c;
    }

    if (!base || !comp) {
      throw new Error('DOCUMENT_VERSION_NOT_FOUND');
    }

    if (base.documentId !== documentId || comp.documentId !== documentId) {
      throw new Error('DOCUMENT_VERSION_MISMATCH');
    }

    return compareVersions(
      base.id,
      base.versionNumber,
      base.markdown,
      base.sections,
      comp.id,
      comp.versionNumber,
      comp.markdown,
      comp.sections
    );
  }

  /**
   * Restores an earlier version, creating a new snapshot from the active version,
   * replacing active text, and inserting a RESTORE history marker.
   */
  static async restoreVersion(params: {
    documentId: string;
    versionId: string;
    expectedUpdatedAt?: string;
    expectedContentHash?: string;
  }): Promise<{ document: any; version: any }> {
    const { documentId, versionId, expectedUpdatedAt, expectedContentHash } = params;

    await this.ensureDocumentHasVersions(documentId);

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current active document and target version
      const doc = await tx.documentation.findUnique({
        where: { id: documentId }
      });
      if (!doc) {
        throw new Error('DOCUMENT_NOT_FOUND');
      }

      const targetVersion = await tx.documentationVersion.findUnique({
        where: { id: versionId }
      });
      if (!targetVersion) {
        throw new Error('DOCUMENT_VERSION_NOT_FOUND');
      }
      if (targetVersion.documentId !== documentId) {
        throw new Error('DOCUMENT_VERSION_MISMATCH');
      }

      // 2. Conflict protection checks
      if (expectedUpdatedAt) {
        const docTime = new Date(doc.updatedAt).getTime();
        const expectedTime = new Date(expectedUpdatedAt).getTime();
        if (Math.abs(docTime - expectedTime) > 1000) { // Allow 1s tolerance for server clock conversions
          throw new Error('DOCUMENT_CHANGED_SINCE_VERSION_VIEW');
        }
      }
      if (expectedContentHash) {
        const activeHash = calculateContentHash(doc.markdown);
        if (activeHash !== expectedContentHash) {
          throw new Error('DOCUMENT_CHANGED_SINCE_VERSION_VIEW');
        }
      }

      // 3. Create a snapshot of the current state before replacing it (if not already versioned)
      const currentActiveHash = calculateContentHash(doc.markdown);
      const latestVersion = await tx.documentationVersion.findFirst({
        where: { documentId },
        orderBy: { versionNumber: 'desc' }
      });

      let snapshotNum = latestVersion ? latestVersion.versionNumber : 0;
      if (!latestVersion || latestVersion.contentHash !== currentActiveHash) {
        snapshotNum++;
        await tx.documentationVersion.create({
          data: {
            documentId,
            versionNumber: snapshotNum,
            markdown: doc.markdown,
            contentHash: currentActiveHash,
            sections: doc.sections || undefined,
            metadata: doc.metadata || undefined,
            qualityScore: doc.qualityScore,
            qualityData: doc.qualityData || undefined,
            sourceType: 'MANUAL_EDIT', // Flag as manual edit snapshot
            sourceLabel: 'Manual edits'
          }
        });
      }

      // Check if targetVersion content matches current content (already current version)
      if (targetVersion.contentHash === currentActiveHash) {
        throw new Error('VERSION_ALREADY_CURRENT');
      }

      // 4. Recalculate Quality Score for the restored markdown using the latest repo analysis
      const analysisRecord = await tx.repositoryAnalysis.findUnique({
        where: { id: doc.repositoryAnalysisId }
      });
      const analysis = analysisRecord ? (typeof analysisRecord.analysisData === 'string' ? JSON.parse(analysisRecord.analysisData) : analysisRecord.analysisData) : {};
      
      const newQuality = QualityEngine.evaluate(targetVersion.markdown, analysis);

      // 5. Update the active Documentation record
      const updatedDoc = await tx.documentation.update({
        where: { id: documentId },
        data: {
          markdown: targetVersion.markdown,
          sections: targetVersion.sections || undefined,
          metadata: targetVersion.metadata || undefined,
          qualityScore: newQuality.overallScore,
          qualityData: newQuality as any,
          qualityEvaluatedAt: new Date(newQuality.evaluatedAt),
          baselineSnapshotId: targetVersion.baselineSnapshotId || undefined,
          baselineUpdatedAt: targetVersion.baselineUpdatedAt || undefined,
        }
      });

      // 6. Create the RESTORE version snapshot
      const finalVersionNum = snapshotNum + 1;
      const restoreVersion = await tx.documentationVersion.create({
        data: {
          documentId,
          versionNumber: finalVersionNum,
          markdown: targetVersion.markdown,
          contentHash: targetVersion.contentHash,
          sections: targetVersion.sections || undefined,
          metadata: targetVersion.metadata || undefined,
          qualityScore: newQuality.overallScore,
          qualityData: newQuality as any,
          sourceType: 'RESTORE',
          sourceLabel: `Restored from Version ${targetVersion.versionNumber}`,
          baselineSnapshotId: targetVersion.baselineSnapshotId || undefined,
          baselineUpdatedAt: targetVersion.baselineUpdatedAt || undefined,
        }
      });

      return {
        document: updatedDoc,
        version: restoreVersion
      };
    });
  }

  private static getDefaultSourceLabel(sourceType: DocumentationVersionSource, num: number): string {
    switch (sourceType) {
      case 'INITIAL_GENERATION': return 'Initial AI generation';
      case 'MANUAL_EDIT': return 'Manual edits';
      case 'SECTION_REGENERATION': return 'Section regenerated';
      case 'FULL_REGENERATION': return 'Full README regenerated';
      case 'QUALITY_IMPROVEMENT': return 'AI quality improvement';
      case 'RESTORE': return `Restored from Version ${num}`;
    }
  }
}
