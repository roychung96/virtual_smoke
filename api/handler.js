import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const getMimeType = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = {
    html: 'text/html; charset=utf-8',
    js: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    wasm: 'application/wasm',
    ico: 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
};

export default function handler(req, res) {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    let filePath = join(process.cwd(), 'dist/client', pathname);

    // If it's a directory or root, try index.html
    if (pathname === '/' || pathname.endsWith('/')) {
      filePath = join(process.cwd(), 'dist/client', 'index.html');
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      // For SPA routing, fallback to index.html
      filePath = join(process.cwd(), 'dist/client', 'index.html');
    }

    if (existsSync(filePath)) {
      const content = readFileSync(filePath);
      res.setHeader('Content-Type', getMimeType(filePath));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).end(content);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
