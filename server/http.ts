// Small HTTP helpers: async error handling, rate limiting, auth guard.

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Ctx } from './context';
import { userFromToken } from './users';

export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** In-memory fixed-window limiter per IP. Good enough for one instance per creator. */
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { n: number; reset: number }>();
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const h = hits.get(key);
    if (!h || h.reset < now) hits.set(key, { n: 1, reset: now + windowMs });
    else if (++h.n > max) {
      res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
      return;
    }
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    next();
  };
}

export interface AuthedRequest extends Request {
  user?: { id: string; email: string | null };
}

export function requireUser(ctx: Ctx): RequestHandler {
  return wrap(async (req: AuthedRequest, res, next) => {
    const user = await userFromToken(ctx, req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Please log in again.' });
      return;
    }
    req.user = user;
    next();
  });
}

export const isEmail = (s: unknown): s is string => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
