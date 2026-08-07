import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: 'ready', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { status: 'not_ready', message: 'Database connection failed' },
      { status: 503 }
    );
  }
}
