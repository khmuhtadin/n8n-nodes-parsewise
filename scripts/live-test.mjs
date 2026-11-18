// Live test against the real Parsewise API. Usage: PARSEWISE_KEY_FILE=... node scripts/live-test.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { Parsewise } = require('../dist/nodes/Parsewise/Parsewise.node.js');
const key = readFileSync(process.env.PARSEWISE_KEY_FILE, 'utf8').trim();
async function http(request) {
  const url = new URL(request.url);
  for (const [k, v] of Object.entries(request.qs || {})) url.searchParams.set(k, v);
  const headers = { 'X-API-Key': key, ...(request.headers || {}) };
  let body = request.body;
  if (body && !Buffer.isBuffer(body)) { body = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const r = await fetch(url, { method: request.method, headers, body });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}
function ctx(params) {
  return { getInputData: () => [{ json: {} }], getNode: () => ({ name: 'Parsewise' }), getNodeParameter: (n, i, d) => params[n] ?? d, continueOnFail: () => false,
    helpers: { httpRequestWithAuthentication: async (_a, req) => http(req), assertBinaryData: () => ({ fileName: 'invoice.txt', mimeType: 'text/plain' }),
      getBinaryDataBuffer: async () => Buffer.from('INVOICE\nInvoice number: INV-1042\nVendor: Acme Corp\nTotal due: 1250.50 USD\nDate: 2026-11-01\n'),
      httpRequest: async () => ({ body: Buffer.from('Receipt\nStore: Blue Bottle\nTotal: 12.00 USD\n'), headers: { 'content-type': 'text/plain' } }) } };
}
const run = (p) => new Parsewise().execute.call(ctx(p)).then((o) => o[0].map((x) => x.json));
const [mode, ...args] = process.argv.slice(2);
const show = (x) => console.log(JSON.stringify(x, null, 1).slice(0, 1500));
if (mode === 'cred') { show(await http({ url: 'https://api.parsewise.ai/api/v1/projects/', method: 'GET' }).then((r) => ({ ok: true, keys: Object.keys(r) }))); }
if (mode === 'extract') show(await run({ operation: 'extract', binaryProperties: 'data', documentUrls: process.env.WITH_URL ? 'https://example.test/receipt.txt' : '', schema: JSON.stringify({ type: 'object', properties: { invoice_number: { type: 'string' }, total: { type: 'number' } } }), autoMap: true, projectName: 'n8n live test' }));
if (mode === 'status') show(await run({ operation: 'getStatus', projectId: args[0] }));
if (mode === 'list') show(await run({ operation: 'listResults', projectId: args[0], page: 1, pageSize: 10 }));
if (mode === 'get') show(await run({ operation: 'getResult', projectId: args[0], resultId: args[1] }));
if (mode === 'dim') show(await run({ operation: 'createDimension', projectId: args[0], dimensionName: 'Test dimension', dimensionDescription: 'live test' }));
if (mode === 'hooks') { show(await run({ operation: 'listWebhooks' })); }
if (mode === 'mkhook') show(await run({ operation: 'createWebhook', webhookUrl: 'https://example.com/n8n-test', events: 'agent.completion.succeeded', headers: '{}', webhookName: 'n8n live test' }));
