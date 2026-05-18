#!/usr/bin/env node
// OpenRouter agent runner: takes a task JSON on stdin, returns {files: {path: content}} JSON on stdout.
// Usage: node agent-runner.mjs < task.json > result.json

import { readFileSync } from 'node:fs';
import { fetch } from 'undici';
import 'dotenv/config';

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(2); }

const task = JSON.parse(readFileSync(0, 'utf8'));
const model = task.model || 'anthropic/claude-3.5-sonnet';
const maxTokens = task.max_tokens || 8000;

const sys = `You are a senior engineer generating production-ready code files.
You will receive a task description and context files. You MUST respond with ONLY a JSON object of the form:
{"files": {"<absolute_path>": "<full_file_contents>", ...}, "notes": "<short summary>"}
Do not wrap in markdown. Do not include any text before or after the JSON. The JSON must be valid and parseable.
Every file path must be absolute. Use the exact paths the user specifies. Generate complete files, not patches.`;

const messages = [
  { role: 'system', content: sys },
  { role: 'user', content: task.prompt }
];

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'HTTP-Referer': 'https://genosync.app',
    'X-Title': 'GenoSync Agent Runner',
  },
  body: JSON.stringify({
    model,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  }),
});

if (!res.ok) {
  const errBody = await res.text();
  console.error(`OR error ${res.status}: ${errBody}`);
  process.exit(3);
}

const data = await res.json();
const content = data.choices?.[0]?.message?.content ?? '';
const usage = data.usage || {};
const stderrInfo = { model_used: data.model, usage };
console.error(JSON.stringify(stderrInfo));

// Try to parse and re-emit so caller gets validated JSON
try {
  const parsed = JSON.parse(content);
  process.stdout.write(JSON.stringify(parsed));
} catch (e) {
  // emit raw so caller can debug
  process.stdout.write(content);
  process.exit(4);
}
