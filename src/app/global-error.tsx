'use client';

import React from 'react';

export default function GlobalErrorBoundary({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex h-screen items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card shadow-2xl text-center space-y-4">
          <h2 className="text-xl font-bold text-foreground">Critical Error</h2>
          <p className="text-sm text-muted-foreground">
            A critical system error occurred. Please refresh the page.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
