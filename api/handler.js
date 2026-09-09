import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  try {
    // Try to import the CF Worker handler
    const cfWorkerModule = await import('../dist/server/index.js');
    const cfHandler = cfWorkerModule.default;

    if (!cfHandler || !cfHandler.fetch) {
      throw new Error('CF Worker handler not found or missing fetch method');
    }

    // Build a Request-like object for the CF Worker
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const cfRequest = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: ['GET', 'HEAD'].includes(req.method) ? null : req.body,
    });

    // Create a minimal env object for CF Worker
    const env = {
      ASSETS: {
        async fetch(request) {
          // Serve static assets from dist/client
          const pathname = new URL(request.url).pathname;
          const filePath = join(process.cwd(), 'dist/client', pathname);

          if (existsSync(filePath)) {
            const content = readFileSync(filePath);
            return new Response(content, { status: 200 });
          }
          return new Response('Not found', { status: 404 });
        },
      },
      IMAGES: {
        async input(data) {
          return {
            transform() {
              return { response: new Response(data, { status: 200 }) };
            },
          };
        },
      },
    };

    // Call the CF Worker handler
    const response = await cfHandler.fetch(cfRequest, env, {});

    // Convert Response to Vercel format
    const buffer = await response.arrayBuffer();
    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }
    res.status(response.status);
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error('Handler error:', error);

    // Fallback: try to serve static files if CF handler fails
    try {
      const assetPath = req.url === '/' ? 'index.html' : req.url.replace(/^\//, '');
      const filePath = join(process.cwd(), 'dist/client', assetPath);

      if (existsSync(filePath)) {
        const ext = assetPath.split('.').pop().toLowerCase();
        const mimeTypes = {
          html: 'text/html',
          js: 'application/javascript',
          css: 'text/css',
          json: 'application/json',
          svg: 'image/svg+xml',
          png: 'image/png',
          wasm: 'application/wasm',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
        res.status(200).send(readFileSync(filePath));
        return;
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }

    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
