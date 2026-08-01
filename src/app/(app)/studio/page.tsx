'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/layout';
import { GradientButton } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export default function StudioEmptyPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-cyan/10 mb-4">
          <FileText className="h-8 w-8 text-brand-cyan" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">No documentation is open</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Generate documentation from a GitHub repository to start editing.
        </p>
        <GradientButton onClick={() => router.push('/analyze')}>
          Analyze a Repository
        </GradientButton>
      </div>
    </PageContainer>
  );
}
