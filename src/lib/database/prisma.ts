import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  let connectionString = `${process.env.DATABASE_URL}`;

  // If using Prisma Postgres local dev URL (prisma+postgres://), decode the direct Postgres URL from the api_key
  if (connectionString.startsWith('prisma+postgres://')) {
    const url = new URL(connectionString);
    const apiKey = url.searchParams.get('api_key');
    if (apiKey) {
      try {
        const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString());
        if (decoded.databaseUrl) {
          connectionString = decoded.databaseUrl;
        }
      } catch (e) {
        console.warn('Failed to parse Prisma Postgres api_key', e);
      }
    }
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };
export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
