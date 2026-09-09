import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// Simple SSR server
const server = createServer((req, res) => {
  // Set common headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    // Try to serve from dist/client for static assets first
    const ext = req.url.split('.').pop();
    const staticExts = ['js', 'css', 'png', 'svg', 'wasm', 'json'];

    if (staticExts.includes(ext) || req.url.includes('_next/') || req.url.includes('mediapipe/')) {
      const filePath = join(__dirname, 'dist/client', req.url);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath);
        const mimeTypes = {
          js: 'application/javascript',
          css: 'text/css',
          png: 'image/png',
          svg: 'image/svg+xml',
          wasm: 'application/wasm',
          json: 'application/json'
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.writeHead(200);
        res.end(content);
        return;
      }
    }

    // For HTML requests, we would need the actual SSR handler
    // For now, return a basic HTML template that loads the app
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Virtual Cigarette</title>
  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/_next/static/css/index.7kmXpPvT.css">
</head>
<body>
  <div id="root"></div>
  <script src="/_next/static/chunks/rolldown-runtime-C60lm6uB.js"></script>
  <script src="/_next/static/chunks/framework-BgSIrAUN.js"></script>
  <script src="/_next/static/chunks/index-BXrd-0X3.js"></script>
</body>
</html>`;

    res.writeHead(200);
    res.end(html);
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Virtual Smoke server running on port ${PORT}`);
});

export default server;
