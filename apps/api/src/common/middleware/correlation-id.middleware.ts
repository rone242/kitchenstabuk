import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header('x-correlation-id');
  const correlationId =
    incoming && incoming.length <= 128 ? incoming : randomUUID();

  response.setHeader('x-correlation-id', correlationId);
  next();
}
