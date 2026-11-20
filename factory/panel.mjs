#!/usr/bin/env node
// The factory's control centre: one page to watch a project's documents,
// gates, tickets, runs and agent context, and to start or stop a run.
// Usage: node factory/panel.mjs [port]. No dependencies.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, openSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const factoryDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(factoryDir, '..');
const runsDir = join(factoryDir, 'runs');
const port = Number(process.argv[2] ?? process.env.FACTORY_PANEL_PORT ?? 4777);
// It can start runs, so every request must carry the token printed at start.
const token = randomBytes(12).toString('hex');

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const inProject = (...parts) => join(projectDir, ...parts);
const list = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

// Lines under one "## heading", and its bullets other than a lone "None."
const section = (text, heading) => {
  const lines = text.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).filter((line) => line.trim());
};
const openItems = (text, heading) =>
  section(text, heading).filter((line) => line.startsWith('- ') && !/^- none\.?$/i.test(line.trim()));
const verdict = (path) => {
  const text = read(path);
  if (!text) return 'not reviewed';
  return /^Verdict: (pass|accepted)$/m.test(text) ? 'passed' : 'failed';
};

function activeRun() {
  const [pid, command, runDir] = read(join(runsDir, '.active')).trim().split(' ');
  if (!pid) return null;
  try {
    process.kill(Number(pid), 0);
    return { pid: Number(pid), command, run: runDir ? relative(runsDir, runDir) : '' };
  } catch {
    return null;
  }
}

function runs() {
  return list(runsDir)
    .filter((name) => /^\d{8}-\d{6}$/.test(name))
    .reverse()
    .map((name) => {
      const dir = join(runsDir, name);
      const files = list(dir);
      const steps = files
        .filter((file) => /^\d\d-.*\.(md|log)$/.test(file))
        .map((file) => {
          const meta = Object.fromEntries(
            read(join(dir, `${file}.meta`)).split('\n').filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)),
          );
          const prompt = read(join(dir, `${file}.prompt`));
          return { file, role: file.replace(/^\d\d-/, '').replace(/\.(md|log)$/, ''), meta, promptChars: prompt.length };
        });
      return { name, steps, events: read(join(dir, 'events.log')).trim().split('\n').filter(Boolean) };
    });
}

function state() {
  const idea = read(inProject('specs/idea.md'));
  const stories = read(inProject('specs/stories.md'));
  const tickets = list(inProject('tickets'))
    .filter((file) => /^\d{3}-.*\.md$/.test(file))
    .map((file) => {
      const text = read(inProject('tickets', file));
      return {
        file: `tickets/${file}`,
        title: (text.match(/^# (.*)$/m) ?? [])[1] ?? file,
        status: (text.match(/^Status: (.*)$/m) ?? [])[1] ?? 'unknown',
        lines: (text.match(/^- \[.\] WHEN /gm) ?? []).length,
      };
    });
  const all = runs();
  return {
    project: projectDir.split(sep).pop(),
    version: (read(join(factoryDir, '.installed')).match(/^version=(.*)$/m) ?? [])[1] ?? 'unknown',
    running: activeRun(),
    idea: idea && {
      assumptions: openItems(idea, 'Assumptions').length,
      undecided: openItems(idea, 'Undecided'),
      review: verdict(inProject('specs/idea.review.md')),
    },
    stories: stories && {
      status: (stories.match(/^Status: (.*)$/m) ?? [])[1] ?? 'unknown',
      count: (stories.match(/^## S\d+ /gm) ?? []).length,
      questions: openItems(stories, 'Open questions'),
      review: verdict(inProject('specs/stories.review.md')),
    },
    check: (read(inProject('specs/intel.md')).match(/^Check command: `(.*)`$/m) ?? [])[1] ?? '',
    checkOverride: process.env.FACTORY_CHECK ?? '',
    tickets,
    ticketReview: verdict(inProject('tickets/review.md')),
    acceptance: verdict(inProject('specs/acceptance.md')),
    events: all[0]?.events.slice(-40) ?? [],
    latestRun: all[0]?.name ?? '',
    console: read(join(runsDir, 'panel.out')).split('\n').slice(-60).join('\n'),
  };
}

// The documents the factory reads and writes, in the order it produces them.
function artifacts() {
  const fixed = [
    'specs/idea.md', 'specs/idea.review.md', 'specs/stories.md', 'specs/stories.review.md',
    'specs/intel.md', 'tickets/review.md', 'tickets/memory.md', 'specs/acceptance.md',
  ];
  const tickets = list(inProject('tickets')).filter((file) => /^\d{3}-.*\.md$/.test(file)).map((file) => `tickets/${file}`);
  return [...fixed.slice(0, 5), ...tickets, ...fixed.slice(5)]
    .filter((path) => existsSync(inProject(path)))
    .map((path) => ({ path, bytes: statSync(inProject(path)).size, changed: statSync(inProject(path)).mtime }));
}

// What every agent run starts with, before its own prompt.
function context() {
  const always = ['CLAUDE.md', 'AGENTS.md', 'factory/FACTORY.md']
    .filter((path) => existsSync(inProject(path)))
    .map((path) => ({ path, bytes: statSync(inProject(path)).size }));
  const roles = list(join(factoryDir, 'prompts')).map((file) => {
    const text = read(join(factoryDir, 'prompts', file));
    return {
      role: file.replace(/\.md$/, ''),
      path: `factory/prompts/${file}`,
      bytes: text.length,
      purpose: section(text, 'Purpose').join(' '),
      reads: section(text, 'Reads').filter((line) => line.startsWith('- ')).map((line) => line.slice(2)),
      writes: section(text, 'Writes').filter((line) => line.startsWith('- ')).map((line) => line.slice(2)),
    };
  });
  return { always, roles };
}

// Only the factory's own documents can be read through the panel.
function safeFile(path) {
  const full = resolve(projectDir, path);
  const allowed = ['specs', 'tickets', join('factory', 'runs'), join('factory', 'prompts')].map((dir) => inProject(dir) + sep);
  const single = ['AGENTS.md', 'CLAUDE.md', join('factory', 'FACTORY.md')].map((file) => inProject(file));
  if (!single.includes(full) && !allowed.some((dir) => full.startsWith(dir))) return null;
  return existsSync(full) && statSync(full).isFile() ? full : null;
}

function act(action, text) {
  if (action === 'stop') {
    spawn('bash', [join(factoryDir, 'stop.sh')], { cwd: projectDir, stdio: 'ignore' });
    return 'Stopping.';
  }
  if (activeRun()) return 'Something is already running. Stop it first.';
  const scripts = { idea: 'idea.sh', plan: 'plan.sh', build: 'build.sh' };
  let command;
  if (action === 'run') {
    // The same chain as `factory run`, kept here so the panel needs only this folder.
    const quoted = `'${String(text).replaceAll("'", "'\\''")}'`;
    command = `factory/idea.sh ${quoted} && git add -A -- specs && (git diff --cached --quiet -- specs || git commit -q -m "factory: idea" -- specs) && factory/plan.sh && factory/build.sh`;
  } else if (scripts[action]) {
    if (action === 'idea' && !String(text ?? '').trim() && !existsSync(inProject('specs/idea.md'))) return 'Type what you want first.';
    command = `factory/${scripts[action]} ${action === 'idea' && text ? `'${String(text).replaceAll("'", "'\\''")}'` : ''}`;
  } else {
    return 'Unknown action.';
  }
  const out = openSync(join(runsDir, 'panel.out'), 'w');
  spawn('bash', ['-c', command], { cwd: projectDir, detached: true, stdio: ['ignore', out, out] }).unref();
  return `Started: ${action}`;
}

const page = /* html */ `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Factory control centre</title>
<style>
  :root { --bg:#f6f7f9; --panel:#fff; --text:#1c2330; --muted:#667085; --line:#dfe3ea; --accent:#2f5fd0; --good:#157347; --bad:#b42318; --warn:#9a6700; }
  @media (prefers-color-scheme: dark) { :root { --bg:#12151b; --panel:#1b2029; --text:#e6e9ef; --muted:#98a2b3; --line:#2c3340; --accent:#7aa2ff; --good:#4ac38a; --bad:#ff8a80; --warn:#e3b341; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:14px/1.5 system-ui, sans-serif; }
  header { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; padding:12px 16px; background:var(--panel); border-bottom:1px solid var(--line); }
  h1 { font-size:16px; margin:0; } h2 { font-size:14px; margin:0 0 8px; }
  .muted { color:var(--muted); } .good { color:var(--good); } .bad { color:var(--bad); } .warn { color:var(--warn); }
  .badge { padding:2px 10px; border-radius:999px; border:1px solid var(--line); font-size:12px; }
  .badge.on { border-color:var(--good); color:var(--good); }
  nav { display:flex; gap:4px; padding:8px 16px 0; background:var(--panel); border-bottom:1px solid var(--line); overflow-x:auto; }
  nav button { border:0; background:none; color:var(--muted); padding:8px 12px; font:inherit; cursor:pointer; border-bottom:2px solid transparent; }
  nav button.active { color:var(--text); border-bottom-color:var(--accent); font-weight:600; }
  main { padding:16px; max-width:1200px; margin:0 auto; }
  section { display:none; } section.active { display:block; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px 14px; margin-bottom:12px; }
  .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); }
  .split { display:grid; gap:12px; grid-template-columns:minmax(200px, 300px) minmax(0, 1fr); }
  @media (max-width: 720px) { .split { grid-template-columns:1fr; } }
  table { width:100%; border-collapse:collapse; } td, th { text-align:left; padding:4px 8px 4px 0; vertical-align:top; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:500; font-size:12px; }
  pre { margin:0; white-space:pre-wrap; word-break:break-word; font:12px/1.5 ui-monospace, Menlo, monospace; max-height:70vh; overflow:auto; }
  .list button { display:block; width:100%; text-align:left; border:0; background:none; color:var(--text); padding:5px 8px; border-radius:6px; font:inherit; cursor:pointer; }
  .list button:hover, .list button.active { background:var(--bg); }
  .list small { color:var(--muted); }
  .actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  .actions input { flex:1 1 260px; padding:7px 10px; border:1px solid var(--line); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; }
  .actions button { padding:7px 12px; border:1px solid var(--line); border-radius:6px; background:var(--panel); color:var(--text); font:inherit; cursor:pointer; }
  .actions button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  .actions button.danger { border-color:var(--bad); color:var(--bad); }
  .actions button:disabled { opacity:.45; cursor:not-allowed; }
</style></head><body>
<header><h1>Factory control centre</h1><span id="project" class="muted"></span><span id="running" class="badge">idle</span><span id="message" class="muted"></span></header>
<nav id="tabs"></nav>
<main>
  <section id="status">
    <div class="card"><h2>Run the factory</h2>
      <div class="actions">
        <input id="text" placeholder="What do you want built, in a sentence?" aria-label="Idea">
        <button data-action="run" class="primary">Run all</button><button data-action="idea">Refine idea</button>
        <button data-action="plan">Plan</button><button data-action="build">Build</button><button data-action="stop" class="danger">Stop</button>
      </div>
      <p class="muted" id="check"></p></div>
    <div class="grid" id="documents"></div>
    <div class="card"><h2>Tickets</h2><table id="tickets"></table></div>
    <div class="card"><h2>Latest run <span id="latest" class="muted"></span></h2><pre id="events"></pre></div>
  </section>
  <section id="artifacts"><div class="split"><div class="card list" id="artifact-list"></div><div class="card"><h2 id="artifact-name">Pick a document</h2><pre id="artifact-body"></pre></div></div></section>
  <section id="logs"><div class="split"><div class="card list" id="run-list"></div><div class="card"><h2 id="log-name">Pick a run step</h2><pre id="log-body"></pre></div></div>
    <div class="card"><h2>Console of the last run started from this page</h2><pre id="console"></pre></div></section>
  <section id="context">
    <div class="card"><h2>What every agent run starts with</h2><table id="always"></table></div>
    <div class="card"><h2>What each role is given</h2><table id="roles"></table></div>
    <div class="split"><div class="card list" id="prompt-list"></div><div class="card"><h2 id="prompt-name">Pick a step to see the exact prompt it was sent</h2><p class="muted" id="prompt-meta"></p><pre id="prompt-body"></pre></div></div>
  </section>
</main>
<script>
const token = new URLSearchParams(location.search).get('token') ?? '';
const $ = (id) => document.getElementById(id);
const api = (path, options = {}) => fetch(path, { ...options, headers: { 'x-factory-token': token, 'content-type': 'application/json' } });
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const tone = (word) => word === 'passed' ? 'good' : word === 'failed' ? 'bad' : 'muted';
const size = (bytes) => bytes + ' chars, about ' + Math.round(bytes / 4) + ' tokens';
const tabs = ['status', 'artifacts', 'logs', 'context'];
let current = 'status';

for (const name of tabs) {
  const button = el('button', name[0].toUpperCase() + name.slice(1));
  button.onclick = () => show(name);
  button.id = 'tab-' + name;
  $('tabs').append(button);
}
function show(name) {
  current = name;
  for (const tab of tabs) { $(tab).classList.toggle('active', tab === name); $('tab-' + tab).classList.toggle('active', tab === name); }
  if (name === 'artifacts') loadArtifacts();
  if (name === 'logs' || name === 'context') loadRuns();
  if (name === 'context') loadContext();
}
async function view(path, nameId, bodyId) {
  $(nameId).textContent = path;
  const response = await api('/api/file?path=' + encodeURIComponent(path));
  $(bodyId).textContent = response.ok ? await response.text() : 'Not available.';
}
function card(title, lines) {
  const box = el('div', undefined, 'card');
  box.append(el('h2', title));
  for (const [text, className] of lines) box.append(el('div', text, className));
  return box;
}
async function refresh() {
  const response = await api('/api/state');
  if (!response.ok) { $('message').textContent = 'Not authorised. Open the address the panel printed, with its token.'; return; }
  const state = await response.json();
  $('project').textContent = state.project + ' · factory ' + state.version;
  $('running').textContent = state.running ? 'running: ' + state.running.command : 'idle';
  $('running').className = 'badge' + (state.running ? ' on' : '');
  for (const button of document.querySelectorAll('[data-action]')) button.disabled = button.dataset.action === 'stop' ? !state.running : Boolean(state.running);
  $('check').textContent = 'Check command: ' + (state.checkOverride ? state.checkOverride + ' (override, set where the panel was started)' : state.check || 'not known yet');
  const documents = $('documents'); documents.replaceChildren();
  documents.append(card('Idea', state.idea ? [[state.idea.assumptions + ' assumptions, ' + state.idea.undecided.length + ' undecided'], ['review ' + state.idea.review, tone(state.idea.review)], ...state.idea.undecided.map((line) => [line, 'warn'])] : [['none yet', 'muted']]));
  documents.append(card('Stories', state.stories ? [[state.stories.status + ', ' + state.stories.count + ' stories'], ['review ' + state.stories.review, tone(state.stories.review)], ...state.stories.questions.map((line) => [line, 'warn'])] : [['none yet', 'muted']]));
  documents.append(card('Tickets', [[state.tickets.filter((t) => t.status === 'done').length + ' done, ' + state.tickets.filter((t) => t.status === 'todo').length + ' to do, ' + state.tickets.filter((t) => t.status === 'blocked').length + ' blocked'], ['review ' + state.ticketReview, tone(state.ticketReview)]]));
  documents.append(card('Acceptance audit', [[state.acceptance === 'not reviewed' ? 'not run yet' : state.acceptance === 'passed' ? 'accepted against the idea' : 'gaps found', tone(state.acceptance)]]));
  const table = $('tickets'); table.replaceChildren();
  for (const ticket of state.tickets) {
    const row = el('tr');
    row.append(el('td', ticket.status, ticket.status === 'done' ? 'good' : ticket.status === 'blocked' ? 'bad' : 'muted'), el('td', ticket.title), el('td', ticket.lines + ' acceptance lines', 'muted'));
    table.append(row);
  }
  if (!state.tickets.length) table.append(el('tr', 'No tickets yet.', 'muted'));
  $('latest').textContent = state.latestRun;
  $('events').textContent = state.events.join('\\n') || 'No run yet.';
  $('console').textContent = state.console || 'Nothing started from this page yet.';
}
async function loadArtifacts() {
  const items = await (await api('/api/artifacts')).json();
  const box = $('artifact-list'); box.replaceChildren();
  for (const item of items) {
    const button = el('button', item.path);
    button.append(el('small', '  ' + item.bytes + ' chars'));
    button.onclick = () => view(item.path, 'artifact-name', 'artifact-body');
    box.append(button);
  }
  if (!items.length) box.append(el('div', 'Nothing produced yet.', 'muted'));
}
async function loadRuns() {
  const items = await (await api('/api/runs')).json();
  for (const [boxId, suffix, nameId, bodyId] of [['run-list', '', 'log-name', 'log-body'], ['prompt-list', '.prompt', 'prompt-name', 'prompt-body']]) {
    const box = $(boxId); box.replaceChildren();
    for (const run of items.slice(0, 15)) {
      box.append(el('div', run.name, 'muted'));
      if (!suffix) { const events = el('button', 'events'); events.onclick = () => view('factory/runs/' + run.name + '/events.log', nameId, bodyId); box.append(events); }
      for (const step of run.steps) {
        if (suffix && !step.promptChars) continue;
        const button = el('button', step.file.replace(/\\.(md|log)$/, ''));
        if (suffix) button.append(el('small', '  about ' + Math.round(step.promptChars / 4) + ' tokens'));
        button.onclick = () => {
          view('factory/runs/' + run.name + '/' + step.file + suffix, nameId, bodyId);
          if (suffix) $('prompt-meta').textContent = 'Tools: ' + (step.meta.tools ?? 'unknown') + (step.meta.denied ? ' · Denied: ' + step.meta.denied : '') + ' · ' + size(step.promptChars);
        };
        box.append(button);
      }
    }
    if (!items.length) box.append(el('div', 'No runs yet.', 'muted'));
  }
}
async function loadContext() {
  const data = await (await api('/api/context')).json();
  const always = $('always'); always.replaceChildren();
  for (const item of data.always) { const row = el('tr'); row.append(el('td', item.path), el('td', size(item.bytes), 'muted')); always.append(row); }
  const roles = $('roles'); roles.replaceChildren();
  const head = el('tr'); for (const title of ['Role', 'Reads', 'Writes', 'Prompt size']) head.append(el('th', title)); roles.append(head);
  for (const role of data.roles) { const row = el('tr'); row.append(el('td', role.role), el('td', role.reads.join('\\n')), el('td', role.writes.join('\\n')), el('td', size(role.bytes), 'muted')); roles.append(row); }
}
for (const button of document.querySelectorAll('[data-action]')) button.onclick = async () => {
  const response = await api('/api/action', { method: 'POST', body: JSON.stringify({ action: button.dataset.action, text: $('text').value }) });
  $('message').textContent = await response.text();
  refresh();
};
show('status'); refresh(); setInterval(() => { refresh(); if (current === 'logs') loadRuns(); }, 2500);
</script></body></html>`;

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const send = (status, body, type = 'application/json') => {
    response.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
    response.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  if (url.pathname === '/') return send(200, page, 'text/html');
  if (request.headers['x-factory-token'] !== token) return send(403, 'Not authorised.', 'text/plain');

  if (url.pathname === '/api/state') return send(200, state());
  if (url.pathname === '/api/artifacts') return send(200, artifacts());
  if (url.pathname === '/api/runs') return send(200, runs());
  if (url.pathname === '/api/context') return send(200, context());
  if (url.pathname === '/api/file') {
    const full = safeFile(url.searchParams.get('path') ?? '');
    return full ? send(200, read(full), 'text/plain') : send(404, 'Not available.', 'text/plain');
  }
  if (url.pathname === '/api/action' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const { action, text } = JSON.parse(body || '{}');
        send(200, act(action, text), 'text/plain');
      } catch {
        send(400, 'Bad request.', 'text/plain');
      }
    });
    return undefined;
  }
  return send(404, 'Not found.', 'text/plain');
}).listen(port, '127.0.0.1', () => {
  console.log(`Factory control centre for ${projectDir}`);
  console.log(`Open: http://127.0.0.1:${port}/?token=${token}`);
  console.log('It listens on this machine only. Over SSH, forward the port first. Ctrl+C to stop.');
});
