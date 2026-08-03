import { prisma } from '../database/prisma';

export class StaleOperationRecovery {
  /**
   * Recovers stale publishing or idempotency operations stuck in progress.
   */
  static async recoverStaleOperations(staleThresholdMs: number = 15 * 60 * 1000): Promise<{
    recoveredPublishes: number;
    recoveredIdempotencyRecords: number;
  }> {
    const cutoff = new Date(Date.now() - staleThresholdMs);

    // 1. Recover stale site publishes stuck in PUBLISHING / BUILDING / PENDING
    const stalePublishes = await prisma.documentationSitePublish.updateMany({
      where: {
        status: { in: ['PENDING', 'BUILDING', 'DEPLOYING'] },
        createdAt: { lt: cutoff },
      },
      data: {
        status: 'FAILED',
        errorCode: 'PUBLISH_TIMED_OUT',
        completedAt: new Date(),
      },
    });

    // 2. Recover stale site state
    await prisma.documentationSite.updateMany({
      where: {
        status: 'PUBLISHING',
        updatedAt: { lt: cutoff },
      },
      data: {
        status: 'FAILED',
      },
    });

    // 3. Recover stale idempotency records
    const staleIdempotency = await prisma.idempotencyRecord.updateMany({
      where: {
        status: 'PROCESSING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'FAILED',
        responseStatus: 504,
        completedAt: new Date(),
      },
    });

    console.log(
      `[RECOVERY] Stale operation recovery complete. Recovered publishes: ${stalePublishes.count}, idempotency records: ${staleIdempotency.count}.`
    );

    return {
      recoveredPublishes: stalePublishes.count,
      recoveredIdempotencyRecords: staleIdempotency.count,
    };
  }
}
