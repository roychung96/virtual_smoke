import cfWorkerHandler from '../dist/server/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cloudflare Worker handler adapter for Vercel
export default async function handler(req, res) {
  try {
    // Build a Request-like object for the CF Worker
    const url = new URL(req.url, `http://${req.headers.host}`);
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
    const response = await cfWorkerHandler.default.fetch(cfRequest, env, {});

    // Convert Response to Vercel format
    const buffer = await response.arrayBuffer();
    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }
    res.status(response.status);
    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
