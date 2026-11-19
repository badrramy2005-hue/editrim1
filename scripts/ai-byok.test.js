import test from 'node:test';
import assert from 'node:assert/strict';
import { runAi } from '../server/aiCore.js';

const withFetch = async (fetchImpl, run) => {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await run();
  } finally {
    globalThis.fetch = previous;
  }
};

test('AI handler uses the client provider key, endpoint and model', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer user-key-for-test');
    assert.equal(JSON.parse(init.body).model, 'test/model');
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Generated copy' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }, async () => {
    const result = await runAi({ action: 'write', prompt: 'A product launch' }, {
      apiKey: 'user-key-for-test',
      baseURL: 'https://openrouter.ai/api/v1',
      model: 'test/model',
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.text, 'Generated copy');
  });
});

test('AI handler reports missing provider credentials without a server key', async () => {
  const result = await runAi({ action: 'write', prompt: 'A product launch' }, {});
  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'MISSING_API_KEY');
});

test('AI handler rejects unsafe provider URLs', async () => {
  const result = await runAi({ action: 'write', prompt: 'A product launch' }, {
    apiKey: 'user-key-for-test',
    baseURL: 'javascript:alert(1)',
    model: 'test/model',
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'INVALID_BASE_URL');
});


