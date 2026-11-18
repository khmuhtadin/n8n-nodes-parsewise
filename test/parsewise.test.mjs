import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Parsewise } = require('../dist/nodes/Parsewise/Parsewise.node.js');
const { ParsewiseApi } = require('../dist/credentials/ParsewiseApi.credentials.js');
function mock(params, response = {}, extra = {}) {
  const calls = [];
  return { calls, ctx: { getInputData: () => [{ json: {} }], getNode: () => ({ name: 'Parsewise', type: 'parsewise', typeVersion: 1, position: [0, 0] }), getNodeParameter: (n, i, d) => params[n] ?? d, continueOnFail: () => false,
    helpers: { httpRequestWithAuthentication: async (auth, request) => { calls.push({ auth, request }); return response; }, assertBinaryData: () => ({ fileName: 'a.txt', mimeType: 'text/plain' }), getBinaryDataBuffer: async () => Buffer.from('hello'), httpRequest: async () => ({ body: new TextEncoder().encode('from url').buffer, headers: { 'content-type': 'text/plain; charset=utf-8' } }), ...extra } } };
}
const B = 'https://api.parsewise.ai/api/v1';
for (const [operation, params, path, method] of [
  ['listResults', { projectId: 'p1', page: 2, pageSize: 5 }, '/projects/p1/results/', 'GET'],
  ['getResult', { projectId: 'p1', resultId: 'r1' }, '/projects/p1/results/r1/', 'GET'],
  ['getStatus', { projectId: 'p1' }, '/projects/p1/status/', 'GET'],
  ['listWebhooks', {}, '/webhooks/', 'GET'],
]) test(`${operation} maps request`, async () => { const { ctx, calls } = mock({ operation, ...params }, { ok: 1 }); const out = await new Parsewise().execute.call(ctx); assert.equal(calls[0].auth, 'parsewiseApi'); assert.equal(calls[0].request.url, B + path); assert.equal(calls[0].request.method, method); assert.equal(out[0][0].json.ok, 1); });
test('createDimension body', async () => { const { ctx, calls } = mock({ operation: 'createDimension', projectId: 'p1', dimensionName: 'Clause', dimensionDescription: 'd' }); await new Parsewise().execute.call(ctx); assert.deepEqual(calls[0].request.body, { name: 'Clause', description: 'd' }); });
test('createWebhook body', async () => { const { ctx, calls } = mock({ operation: 'createWebhook', webhookUrl: 'https://x.test/h', events: 'agent.completion.succeeded, webhook.ping', headers: '{"Authorization":"k"}', webhookName: 'n' }); await new Parsewise().execute.call(ctx); assert.deepEqual(calls[0].request.body, { url: 'https://x.test/h', subscribed_events: ['agent.completion.succeeded', 'webhook.ping'], headers: { Authorization: 'k' }, name: 'n' }); });
test('extract builds multipart with binary and url files', async () => { const { ctx, calls } = mock({ operation: 'extract', binaryProperties: 'data', documentUrls: 'https://x.test/b.txt', schema: '{"type":"object"}', autoMap: true, projectName: 'P' }, { project_id: 'x' }); await new Parsewise().execute.call(ctx); const r = calls[0].request; const t = r.body.toString(); assert.equal(r.url, B + '/extract/'); assert.match(r.headers['Content-Type'], /^multipart\/form-data; boundary=/); assert.match(t, /name="files"; filename="a.txt"/); assert.match(t, /filename="b.txt"/); assert.match(t, /name="auto_map"\r\n\r\ntrue/); assert.match(t, /project_name"\r\n\r\nP/); assert.equal(r.json, false); });
test('extract requires a document', async () => { const { ctx } = mock({ operation: 'extract', binaryProperties: '', documentUrls: '', schema: '{}', autoMap: true }); await assert.rejects(new Parsewise().execute.call(ctx), /at least one/); });
test('credential test is auth-checked GET', () => { const c = new ParsewiseApi(); assert.equal(c.test.request.url, '/projects/'); assert.equal(c.test.request.method, 'GET'); assert.equal(c.authenticate.properties.headers['X-API-Key'], '={{$credentials.apiKey}}'); });
test('usable as tool', () => assert.equal(new Parsewise().description.usableAsTool, true));
