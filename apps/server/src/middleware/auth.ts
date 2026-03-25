import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';

// Generate a stable secret on first boot if none provided
const JWT_SECRET: string = process.env.JWT_SECRET ?? randomBytes(64).toString('hex');
const TOKEN_EXPIRY = '24h';

export { JWT_SECRET, TOKEN_EXPIRY };

export interface JwtPayload {
  username: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Routes that skip auth
const PUBLIC_PATHS = ['/api/auth/login'];

// Prefixes that skip auth (read-only metrics, safe to expose behind nginx)
const PUBLIC_PREFIXES = ['/api/system/', '/api/docker/', '/api/tools/available', '/api/setup/', '/api/health', '/api/errors', '/api/memory/', '/api/fleet/register', '/api/fleet/heartbeat'];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for non-API routes (static files, SPA)
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  // Skip auth for public endpoints
  if (PUBLIC_PATHS.includes(req.path)) {
    next();
    return;
  }

  // Skip auth for read-only metric prefixes
  if (PUBLIC_PREFIXES.some(prefix => req.path.startsWith(prefix))) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
