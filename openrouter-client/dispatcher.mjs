#!/usr/bin/env node
// Parallel OR dispatcher with per-task model routing + fallback chain.
//
// Normal mode:  stdin {tasks:[{name, model?, fallbackModels?, max_tokens?, prompt}], write?:bool}
//   stdout {results:[{name, ok, files?, notes?, error?, model_used?, usage?, attempts?}]}
//
// Probe mode:   `node dispatcher.mjs --probe`  (reads no stdin)
//   Pings /v1/models and a 1-token completion per candidate slug; prints which are live.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetch } from 'undici';
import 'dotenv/config';

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(2); }
const BASE = 'https://openrouter.ai/api/v1';
const H = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'HTTP-Referer': 'https://genosync.app',
  'X-Title': 'GenoSync Dispatcher',
};

// Candidate slugs used by the routing policy (probe verifies reachability).
const POLICY_MODELS = [
  'openai/gpt-5.3-codex',
  'qwen/qwen3-coder-plus',
  'deepseek/deepseek-v4-pro',
  'qwen/qwen3-coder:free',
  'openai/gpt-oss-120b:free',
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

async function probe() {
  const out = { catalogReachable: false, live: [], dead: [] };
  try {
    const r = await fetch(`${BASE}/models`, { headers: H });
    out.catalogReachable = r.ok;
    const d = await r.json();
    const ids = new Set((d.data || []).map(m => m.id));
    for (const slug of POLICY_MODELS) out[ids.has(slug) ? 'live' : 'dead'].push(slug);
  } catch (e) {
    out.error = e.message;
  }
  // tiny completion check for each "live" slug
  const verified = [];
  for (const slug of out.live) {
    try {
      const r = await fetch(`${BASE}/chat/completions`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ model: slug, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
      });
      verified.push({ slug, ok: r.ok, status: r.status });
    } catch (e) {
      verified.push({ slug, ok: false, status: e.message });
    }
  }
  out.completionCheck = verified;
  process.stdout.write(JSON.stringify(out, null, 2));
}

const SYS = `You are a senior engineer producing production-ready code for the GenoSync project.
Respond with ONLY a JSON object: {"files": {"<absolute_path>": "<full_file_contents>", ...}, "notes": "<short summary>"}
No markdown wrapping. No commentary outside the JSON. The JSON must be valid and parseable.
Every file path must be absolute. Generate complete files, not patches.
For TypeScript/TSX ensure imports are correct and types are sound. For Rust use Anchor 0.28 conventions.
Be concise; prefer fewer larger files over many tiny files when reasonable.`;

async function callModel(model, task) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { ...H, 'X-Title': `GenoSync Dispatcher: ${task.name}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: task.prompt },
      ],
      temperature: 0.2,
      max_tokens: task.max_tokens || 16000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, reason: `${res.status}: ${body.slice(0, 300)}` };
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content.trim()) return { ok: false, reason: 'empty_response', usage: data.usage };
  try {
    const parsed = JSON.parse(content);
    return { ok: true, parsed, model_used: data.model, usage: data.usage };
  } catch (e) {
    return { ok: false, reason: 'unparseable_json: ' + e.message, raw_head: content.slice(0, 300), usage: data.usage };
  }
}

async function runOne(task) {
  const t0 = Date.now();
  const chain = [task.model || 'openai/gpt-5.3-codex', ...(task.fallbackModels || [])];
  const attempts = [];
  for (const model of chain) {
    try {
      const r = await callModel(model, task);
      attempts.push({ model, ok: r.ok, reason: r.reason });
      if (r.ok) {
        return {
          name: task.name, ok: true,
          files: r.parsed.files || {}, notes: r.parsed.notes || '',
          model_used: r.model_used, usage: r.usage,
          attempts, ms: Date.now() - t0,
        };
      }
    } catch (e) {
      attempts.push({ model, ok: false, reason: e.message });
    }
  }
  return { name: task.name, ok: false, error: 'all_models_failed', attempts, ms: Date.now() - t0 };
}

if (process.argv.includes('--probe')) {
  await probe();
} else {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const tasks = input.tasks || [];
  const writeMode = input.write === true;
  const results = await Promise.all(tasks.map(runOne));
  if (writeMode) {
    for (const r of results) {
      if (!r.ok || !r.files) continue;
      for (const [absPath, content] of Object.entries(r.files)) {
        try {
          mkdirSync(dirname(absPath), { recursive: true });
          writeFileSync(absPath, content);
        } catch (e) {
          r.write_errors = r.write_errors || [];
          r.write_errors.push(`${absPath}: ${e.message}`);
        }
      }
    }
  }
  process.stdout.write(JSON.stringify({ results }, null, 2));
}
