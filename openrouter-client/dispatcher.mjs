#!/usr/bin/env node
// Parallel OR dispatcher. stdin: {tasks: [{name, model?, max_tokens?, prompt}]}.
// stdout: {results: [{name, ok, files?, notes?, error?, model_used?, usage?}]}
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetch } from 'undici';
import 'dotenv/config';

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(2); }

const input = JSON.parse(readFileSync(0, 'utf8'));
const tasks = input.tasks || [];
const writeMode = input.write === true; // if true, write files to disk

const SYS = `You are a senior engineer generating production-ready code files for the GenoSync project.
Respond with ONLY a JSON object: {"files": {"<absolute_path>": "<full_file_contents>", ...}, "notes": "<short summary>"}
No markdown wrapping. No commentary outside the JSON. The JSON must be valid and parseable.
Every file path must be absolute. Generate complete files, not patches.
For TypeScript/TSX, ensure imports are correct and types are sound. For Rust, ensure Anchor 0.28 conventions.
Be concise; prefer fewer larger files over many tiny files when reasonable.`;

async function runOne(task) {
  const t0 = Date.now();
  const model = task.model || 'openai/gpt-5.3-codex';
  const maxTokens = task.max_tokens || 16000;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://genosync.app',
        'X-Title': `GenoSync Dispatcher: ${task.name}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: task.prompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { name: task.name, ok: false, error: `${res.status}: ${body.slice(0,500)}`, ms: Date.now()-t0 };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    let parsed;
    try { parsed = JSON.parse(content); }
    catch (e) { return { name: task.name, ok: false, error: 'unparseable_json: ' + e.message, raw_head: content.slice(0,400), ms: Date.now()-t0, usage: data.usage }; }
    return {
      name: task.name,
      ok: true,
      files: parsed.files || {},
      notes: parsed.notes || '',
      model_used: data.model,
      usage: data.usage,
      ms: Date.now()-t0,
    };
  } catch (e) {
    return { name: task.name, ok: false, error: e.message, ms: Date.now()-t0 };
  }
}

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
