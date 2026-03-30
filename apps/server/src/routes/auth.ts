import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { signToken, verifyToken, JWT_SECRET } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Rate limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Hash the default password at startup
let adminPasswordHash: string | null = null;

async function getAdminCredentials(): Promise<{ username: string; passwordHash: string }> {
  const username = process.env.CROWBYTE_USER ?? 'admin';

  if (!adminPasswordHash) {
    const plaintext = process.env.CROWBYTE_PASS ?? 'crowbyte';
    if (!process.env.CROWBYTE_PASS && !process.env.CROWBYTE_PASS_HASH) {
      console.warn('[!] CROWBYTE_PASS is not set. Using the default password "crowbyte".');
      console.warn('[!] Change it immediately by setting CROWBYTE_PASS or CROWBYTE_PASS_HASH in your .env file.');
    }
    adminPasswordHash = await bcrypt.hash(plaintext, 12);
  }

  return { username, passwordHash: adminPasswordHash };
}

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const admin = await getAdminCredentials();

    if (username !== admin.username) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // If CROWBYTE_PASS_HASH is set, use it directly (pre-hashed)
    const hashToCompare = process.env.CROWBYTE_PASS_HASH ?? admin.passwordHash;
    const valid = await bcrypt.compare(password, hashToCompare);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ username });
    const refreshToken = jwt.sign({ username, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      refreshToken,
      user: { username },
      expiresIn: 86400, // 24h in seconds
    });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { username: string; type: string };

    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const token = signToken({ username: decoded.username });
    const newRefreshToken = jwt.sign(
      { username: decoded.username, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      refreshToken: newRefreshToken,
      expiresIn: 86400,
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Refresh token expired, please login again' });
    } else {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    username: req.user.username,
    iat: req.user.iat,
    exp: req.user.exp,
  });
});

export default router;
