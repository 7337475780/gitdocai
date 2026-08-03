import { QualityStatus, QualitySummaryResult } from './intelligence-types';

export class QualitySummaryCalculator {
  static calculate(documents: Array<{ qualityScore: number | null | undefined }>): QualitySummaryResult {
    let sum = 0;
    let validCount = 0;
    let lowestScore: number | null = null;
    let below60Count = 0;
    let between60And79Count = 0;
    let eightyOrAboveCount = 0;
    let unknownCount = 0;

    for (const doc of documents) {
      if (typeof doc.qualityScore === 'number' && !isNaN(doc.qualityScore)) {
        const score = doc.qualityScore;
        sum += score;
        validCount++;

        if (lowestScore === null || score < lowestScore) {
          lowestScore = score;
        }

        if (score < 60) {
          below60Count++;
        } else if (score < 80) {
          between60And79Count++;
        } else {
          eightyOrAboveCount++;
        }
      } else {
        unknownCount++;
      }
    }

    if (validCount === 0) {
      return {
        status: QualityStatus.UNKNOWN,
        averageScore: null,
        lowestScore: null,
        below60Count: 0,
        between60And79Count: 0,
        eightyOrAboveCount: 0,
        unknownCount: documents.length,
        userFacingLabel: 'Quality Not Evaluated',
      };
    }

    const averageScore = Math.round(sum / validCount);
    let status: QualityStatus;
    let userFacingLabel: string;

    if (lowestScore !== null && lowestScore < 50) {
      status = QualityStatus.POOR;
      userFacingLabel = 'Poor Quality';
    } else if (lowestScore !== null && lowestScore < 75) {
      status = QualityStatus.NEEDS_IMPROVEMENT;
      userFacingLabel = 'Needs Improvement';
    } else if (averageScore >= 90 && (lowestScore === null || lowestScore >= 80)) {
      status = QualityStatus.EXCELLENT;
      userFacingLabel = 'Excellent Quality';
    } else if (averageScore >= 75 && (lowestScore === null || lowestScore >= 60)) {
      status = QualityStatus.GOOD;
      userFacingLabel = 'Good Quality';
    } else {
      status = QualityStatus.NEEDS_IMPROVEMENT;
      userFacingLabel = 'Needs Improvement';
    }

    return {
      status,
      averageScore,
      lowestScore,
      below60Count,
      between60And79Count,
      eightyOrAboveCount,
      unknownCount,
      userFacingLabel,
    };
  }
}
