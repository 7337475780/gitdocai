import React, { use } from 'react';
import { IntelligenceView } from '@/components/intelligence/intelligence-view';

export default function RepositoryIntelligencePage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = use(params);

  return <IntelligenceView analysisId={analysisId} />;
}
