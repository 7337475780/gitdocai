import { RepositoryChange, RepositoryChangeType, ChangeImportance } from './freshness-types';

export const changeClassifier = {
  classify(rawChanges: RepositoryChange[]): RepositoryChange[] {
    return rawChanges.map(change => {
      const importance = this.calculateImportance(change);
      const confidence = this.calculateConfidence(change);
      return {
        ...change,
        importance,
        confidence,
      };
    });
  },

  calculateImportance(change: RepositoryChange): ChangeImportance {
    if (change.importance === 'CRITICAL') return 'CRITICAL';

    // Upgrade to CRITICAL if a documented item like API endpoint or script was directly removed
    if (change.evidence?.startsWith('removed_') || change.evidence?.startsWith('script:')) {
      if (change.evidence.startsWith('removed_api_endpoint:') || change.evidence.startsWith('removed_script:') || change.evidence.startsWith('removed_env_var:')) {
        return 'CRITICAL';
      }
    }

    if (change.type === RepositoryChangeType.API_CHANGED || change.type === RepositoryChangeType.ENVIRONMENT_CHANGED || change.type === RepositoryChangeType.DATABASE_CHANGED) {
      return 'HIGH';
    }

    if (change.type === RepositoryChangeType.DEPENDENCY_CHANGED || change.type === RepositoryChangeType.CONFIGURATION_CHANGED || change.type === RepositoryChangeType.DOCKER_CHANGED) {
      return 'MEDIUM';
    }

    if (change.type === RepositoryChangeType.FILE_ADDED || change.type === RepositoryChangeType.FILE_MODIFIED) {
      if (change.path.endsWith('.css') || change.path.includes('.test.')) {
        return 'LOW';
      }
    }

    return change.importance;
  },

  calculateConfidence(change: RepositoryChange): number {
    if (change.evidence) return 95;
    if (change.type === RepositoryChangeType.SCRIPT_CHANGED || change.type === RepositoryChangeType.ENVIRONMENT_CHANGED) return 90;
    if (change.type === RepositoryChangeType.API_CHANGED || change.type === RepositoryChangeType.DATABASE_CHANGED) return 85;
    if (change.type === RepositoryChangeType.FILE_RENAMED) return 90;
    return change.confidence || 75;
  }
};
