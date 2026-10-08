import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
app.disable('x-powered-by');

const requestBuckets = new Map<string, { startedAt: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 240;

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  const key = `${req.ip}:${req.path.startsWith('/api/auth') ? 'auth' : 'api'}`;
  const now = Date.now();
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
  } else {
    bucket.count += 1;
    const limit = req.path.startsWith('/api/auth') ? 30 : RATE_LIMIT;
    if (bucket.count > limit) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const configuredOrigin = process.env.APP_ORIGIN;
app.use('/api', (req, res, next) => {
  if (configuredOrigin && req.headers.origin === configuredOrigin) {
    res.setHeader('Access-Control-Allow-Origin', configuredOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'PG Saathi', version: '1.0.0', timestamp: new Date().toISOString() });
});

async function startServer() {
  // Load the API after dotenv so authentication, AI, payment, and the data store
  // all see the same environment configuration during module initialization.
  const { apiRouter } = await import('./server/routes');
  app.use('/api', apiRouter);
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built static assets from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled request error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PG Saathi server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
