import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function GET() {
  let dbStatus = 'healthy';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'unhealthy';
  }

  const isHealthy = dbStatus === 'healthy';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      checks: {
        database: dbStatus,
        application: 'healthy',
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
