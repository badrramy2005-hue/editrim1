import { runAi, aiHealth } from '../server/aiCore.js';

export const config = { maxDuration: 60 };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 4_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function readProviderSettings(req, payload) {
  const apiKey = String(req.headers['x-ai-api-key'] ?? payload?.provider?.apiKey ?? '').trim();
  const baseURL = String(req.headers['x-ai-base-url'] ?? payload?.provider?.baseURL ?? '').trim();
  const model = String(req.headers['x-ai-model'] ?? payload?.provider?.model ?? '').trim();
  return {
    apiKey: apiKey || process.env.AI_GATEWAY_API_KEY,
    baseURL: baseURL || process.env.AI_GATEWAY_BASE_URL,
    model: model || process.env.AI_MODEL,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    if (req.method === 'GET') {
      res.statusCode = 200;
      res.end(JSON.stringify(aiHealth(Boolean(process.env.AI_GATEWAY_API_KEY))));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed.', stage: 'request', code: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  try {
    let payload = req.body;
    if (typeof payload === 'string') payload = JSON.parse(payload);
    if (!payload) {
      const raw = await readBody(req);
      payload = JSON.parse(raw || '{}');
    }
    const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    const result = await runAi(payload, {
      ...readProviderSettings(req, payload),
      ip,
    });
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch (err) {
    res.statusCode = err?.statusCode || 400;
    res.end(JSON.stringify({
      ok: false,
      error: err?.statusCode === 413 ? 'The AI request body is too large.' : 'The AI request body was not valid JSON.',
      stage: 'request',
      code: err?.statusCode === 413 ? 'BODY_TOO_LARGE' : 'INVALID_JSON_BODY',
      status: err?.statusCode || 400,
      requestId: `ai_${Date.now().toString(36)}`,
    }));
  }
}
