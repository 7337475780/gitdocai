import { create } from 'zustand';
import { RepositoryAnalysisResult } from '@/types';

export type AnalysisStatus = 'idle' | 'validating' | 'analyzing' | 'success' | 'error';
// We add 'rate_limited' mapping to our error UI later, but for now we map it to existing ones or just 'failed' with a message.
// The store errorType is used to map to the UI.
export type ErrorType = 'invalid_url' | 'not_found' | 'private' | 'rate_limited' | 'failed' | null;

interface AnalysisStore {
  url: string;
  status: AnalysisStatus;
  errorType: ErrorType;
  errorMessage: string | null;
  result: RepositoryAnalysisResult | null;
  
  setUrl: (url: string) => void;
  startAnalysis: () => Promise<void>;
  reset: () => void;
  setError: (type: ErrorType, message?: string) => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  url: '',
  status: 'idle',
  errorType: null,
  errorMessage: null,
  result: null,

  setUrl: (url: string) => set({ url, errorType: null, errorMessage: null }),
  
  setError: (type: ErrorType, message?: string) => set({ status: 'error', errorType: type, errorMessage: message || null }),

  startAnalysis: async () => {
    const currentUrl = get().url.trim();
    
    set({ status: 'validating', errorType: null, errorMessage: null });

    // Validate URL format
    const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git|\/)?$/i;
    const shortGithubRegex = /^github\.com\/[\w.-]+\/[\w.-]+(\.git|\/)?$/i;
    
    if (!githubUrlRegex.test(currentUrl) && !shortGithubRegex.test(currentUrl)) {
      set({ status: 'error', errorType: 'invalid_url' });
      return;
    }

    set({ status: 'analyzing' });

    try {
      const response = await fetch('/api/repositories/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repositoryUrl: currentUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const code = data?.error?.code;
        const message = data?.error?.message;

        if (code === 'INVALID_URL') {
          set({ status: 'error', errorType: 'invalid_url' });
        } else if (code === 'NOT_FOUND') {
          set({ status: 'error', errorType: 'not_found' });
        } else if (code === 'RATE_LIMITED') {
          set({ status: 'error', errorType: 'rate_limited', errorMessage: message });
        } else {
          set({ status: 'error', errorType: 'failed', errorMessage: message });
        }
        return;
      }

      // Success
      set({ status: 'success', result: data.data });

    } catch (error) {
      console.error('Failed to analyze repository:', error);
      set({ status: 'error', errorType: 'failed', errorMessage: 'A network error occurred. Please try again.' });
    }
  },

  reset: () => set({ url: '', status: 'idle', errorType: null, errorMessage: null, result: null }),
}));
