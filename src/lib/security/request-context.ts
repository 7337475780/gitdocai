import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  clientIp: string;
  userAgent?: string;
  userId?: string;
}

export class RequestContextStore {
  static getContext(req?: Request): RequestContext {
    const requestId =
      req?.headers.get('x-request-id') ||
      req?.headers.get('x-correlation-id') ||
      `req_${uuidv4().substring(0, 12)}`;

    const clientIp =
      req?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req?.headers.get('x-real-ip') ||
      '127.0.0.1';

    const userAgent = req?.headers.get('user-agent') || undefined;

    return {
      requestId,
      clientIp,
      userAgent,
    };
  }
}
