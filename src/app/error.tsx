'use client';

import React from 'react';
import Link from 'next/link';

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled UI error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card shadow-2xl text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          An unhandled application error occurred. You can retry the operation or return to safety.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/studio"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 transition-colors"
          >
            Go to Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
