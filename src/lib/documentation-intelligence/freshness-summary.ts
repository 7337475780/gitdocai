import { FreshnessSummaryResult } from './intelligence-types';

export class FreshnessSummaryCalculator {
  static calculate(latestScan: any, generatedDocCount: number): FreshnessSummaryResult {
    if (!latestScan || !latestScan.impacts || !Array.isArray(latestScan.impacts)) {
      return {
        status: 'UNKNOWN',
        lastScannedAt: null,
        upToDateCount: 0,
        changesDetectedCount: 0,
        reviewRecommendedCount: 0,
        outdatedCount: 0,
        unknownCount: generatedDocCount,
      };
    }

    let upToDateCount = 0;
    let changesDetectedCount = 0;
    let reviewRecommendedCount = 0;
    let outdatedCount = 0;
    let unknownCount = 0;

    for (const impact of latestScan.impacts) {
      const status = impact.status || 'UNKNOWN';
      switch (status) {
        case 'UP_TO_DATE':
          upToDateCount++;
          break;
        case 'CHANGES_DETECTED':
          changesDetectedCount++;
          break;
        case 'REVIEW_RECOMMENDED':
          reviewRecommendedCount++;
          break;
        case 'OUTDATED':
          outdatedCount++;
          break;
        default:
          unknownCount++;
          break;
      }
    }

    let status: FreshnessSummaryResult['status'];
    if (outdatedCount > 0) {
      status = 'OUTDATED';
    } else if (reviewRecommendedCount > 0) {
      status = 'REVIEW_RECOMMENDED';
    } else if (changesDetectedCount > 0) {
      status = 'CHANGES_DETECTED';
    } else if (upToDateCount > 0 && outdatedCount === 0 && reviewRecommendedCount === 0 && changesDetectedCount === 0) {
      status = 'UP_TO_DATE';
    } else {
      status = 'UNKNOWN';
    }

    return {
      status,
      lastScannedAt: latestScan.scannedAt ? new Date(latestScan.scannedAt).toISOString() : null,
      upToDateCount,
      changesDetectedCount,
      reviewRecommendedCount,
      outdatedCount,
      unknownCount,
    };
  }
}
