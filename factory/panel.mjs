#!/usr/bin/env node
// The factory's control centre: one page to oversee every line of work in a
// project, read what each produced, see what each agent run was given, ask the
// manager questions, and start or stop a run.
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
const first = (text, pattern) => (text.match(pattern) ?? [])[1];

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

function tickets(line) {
  return list(inProject(line, 'tickets'))
    .filter((file) => /^\d{3}-.*\.md$/.test(file))
    .map((file) => {
      const text = read(inProject(line, 'tickets', file));
      return {
        file: `${line}/tickets/${file}`,
        title: first(text, /^# (.*)$/m) ?? file,
        status: first(text, /^Status: (.*)$/m) ?? 'unknown',
        lines: (text.match(/^- \[.\] WHEN /gm) ?? []).length,
      };
    });
}

// Every line of work: one folder per feature or bug, numbered in the order asked for.
function lines() {
  const found = [];
  for (const kind of ['features', 'bugs']) {
    for (const name of list(inProject('work', kind))) {
      if (!/^\d{3}-/.test(name)) continue;
      const dir = `work/${kind}/${name}`;
      const all = tickets(dir);
      const accepted = /^Verdict: accepted$/m.test(read(inProject(dir, 'acceptance.md')));
      let stage = 'started';
      if (accepted) stage = 'accepted';
      else if (all.some((ticket) => ticket.status === 'blocked')) stage = 'blocked';
      else if (all.length) stage = `building, ${all.filter((ticket) => ticket.status === 'done').length} of ${all.length} tickets`;
      else if (existsSync(inProject(dir, 'stories.md'))) stage = 'planning';
      else if (existsSync(inProject(dir, 'idea.md'))) stage = 'idea';
      found.push({ dir, name, number: name.slice(0, 3), kind: kind.slice(0, -1), stage, accepted, request: read(inProject(dir, 'request.md')).trim() });
    }
  }
  return found.sort((a, b) => a.number.localeCompare(b.number));
}

// The line commands act on by default: the newest one not yet accepted.
const currentLine = (all) => [...all].reverse().find((line) => !line.accepted)?.dir ?? '';
const knownLine = (dir) => lines().find((line) => line.dir === dir)?.dir ?? '';

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
      const steps = list(dir)
        .filter((file) => /^\d\d-.*\.(md|log)$/.test(file))
        .map((file) => {
          const meta = Object.fromEntries(
            read(join(dir, `${file}.meta`)).split('\n').filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)),
          );
          return { file, meta, promptChars: read(join(dir, `${file}.prompt`)).length };
        });
      return { name, steps, events: read(join(dir, 'events.log')).trim().split('\n').filter(Boolean) };
    });
}

function state(requested) {
  const all = lines();
  const line = knownLine(requested) || currentLine(all) || all.at(-1)?.dir || '';
  const idea = line ? read(inProject(line, 'idea.md')) : '';
  const stories = line ? read(inProject(line, 'stories.md')) : '';
  const history = runs();
  return {
    project: projectDir.split(sep).pop(),
    version: first(read(join(factoryDir, '.installed')), /^version=(.*)$/m) ?? 'unknown',
    running: activeRun(),
    lines: all,
    line,
    current: currentLine(all),
    idea: idea && {
      assumptions: openItems(idea, 'Assumptions').length,
      undecided: openItems(idea, 'Undecided'),
      review: verdict(inProject(line, 'idea.review.md')),
    },
    stories: stories && {
      status: first(stories, /^Status: (.*)$/m) ?? 'unknown',
      count: (stories.match(/^## S\d+ /gm) ?? []).length,
      questions: openItems(stories, 'Open questions'),
      review: verdict(inProject(line, 'stories.review.md')),
    },
    check: line ? first(read(inProject(line, 'intel.md')), /^Check command: `(.*)`$/m) ?? '' : '',
    checkOverride: process.env.FACTORY_CHECK ?? '',
    tickets: line ? tickets(line) : [],
    ticketReview: line ? verdict(inProject(line, 'tickets/review.md')) : 'not reviewed',
    acceptance: line ? verdict(inProject(line, 'acceptance.md')) : 'not reviewed',
    documented: Boolean(line) && existsSync(inProject(line, 'summary.md')),
    events: history[0]?.events.slice(-40) ?? [],
    latestRun: history[0]?.name ?? '',
    console: read(join(runsDir, 'panel.out')).split('\n').slice(-60).join('\n'),
    answer: read(join(runsDir, 'last-answer.md')),
  };
}

// The documents of one line, in the order the factory produces them.
function artifacts(requested) {
  const line = knownLine(requested);
  if (!line) return [];
  const before = ['request.md', 'idea.md', 'idea.review.md', 'stories.md', 'stories.review.md', 'intel.md'];
  const after = ['tickets/review.md', 'acceptance.md', 'summary.md'];
  const paths = [
    ...before.map((file) => `${line}/${file}`),
    ...tickets(line).map((ticket) => ticket.file),
    ...after.map((file) => `${line}/${file}`),
    'work/memory.md',
  ];
  return paths
    .filter((path) => existsSync(inProject(path)))
    .map((path) => ({ path, bytes: statSync(inProject(path)).size }));
}

// What every agent run starts with, before its own prompt.
function context() {
  const always = ['CLAUDE.md', 'AGENTS.md', 'factory/FACTORY.md']
    .filter((path) => existsSync(inProject(path)))
    .map((path) => ({ path, bytes: statSync(inProject(path)).size }));
  const roles = list(join(factoryDir, 'prompts')).map((file) => {
    const text = read(join(factoryDir, 'prompts', file));
    const bullets = (heading) => section(text, heading).filter((line) => line.startsWith('- ')).map((line) => line.slice(2));
    return { role: file.replace(/\.md$/, ''), bytes: text.length, reads: bullets('Reads'), writes: bullets('Writes') };
  });
  return { always, roles };
}

// Only the factory's own documents can be read through the panel.
function safeFile(path) {
  const full = resolve(projectDir, path);
  const folders = ['work', join('factory', 'runs'), join('factory', 'prompts')].map((dir) => inProject(dir) + sep);
  const files = ['AGENTS.md', 'CLAUDE.md', join('factory', 'FACTORY.md')].map((file) => inProject(file));
  if (!files.includes(full) && !folders.some((dir) => full.startsWith(dir))) return null;
  return existsSync(full) && statSync(full).isFile() ? full : null;
}

const quote = (text) => `'${String(text ?? '').replaceAll("'", "'\\''")}'`;

function act(action, text, requested) {
  if (action === 'stop') {
    spawn('bash', [join(factoryDir, 'stop.sh')], { cwd: projectDir, stdio: 'ignore' });
    return 'Stopping.';
  }
  if (activeRun()) return 'Something is already running. Stop it first.';
  const typed = String(text ?? '').trim();
  const line = knownLine(requested);
  const onLine = line ? `FACTORY_LINE=${line.split('/').pop().slice(0, 3)} ` : '';
  // Each starts the same script the command line would.
  const commands = {
    feature: typed && `factory/run.sh ${quote(typed)}`,
    fix: typed && `factory/run.sh --bug ${quote(typed)}`,
    idea: typed && `factory/idea.sh ${quote(typed)}`,
    ask: typed && `factory/ask.sh ${quote(typed)}`,
    plan: `${onLine}factory/plan.sh`,
    build: `${onLine}factory/build.sh`,
  };
  if (!(action in commands)) return 'Unknown action.';
  if (!commands[action]) return 'Type something first.';
  const out = openSync(join(runsDir, 'panel.out'), 'w');
  spawn('bash', ['-c', commands[action]], { cwd: projectDir, detached: true, stdio: ['ignore', out, out] }).unref();
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
  .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); }
  .split { display:grid; gap:12px; grid-template-columns:minmax(200px, 320px) minmax(0, 1fr); }
  @media (max-width: 720px) { .split { grid-template-columns:1fr; } }
  table { width:100%; border-collapse:collapse; } td, th { text-align:left; padding:5px 8px 5px 0; vertical-align:top; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:500; font-size:12px; }
  tr.pick { cursor:pointer; } tr.pick:hover td { background:var(--bg); } tr.chosen td { font-weight:600; }
  pre { margin:0; white-space:pre-wrap; word-break:break-word; font:12px/1.5 ui-monospace, Menlo, monospace; max-height:70vh; overflow:auto; }
  .list button { display:block; width:100%; text-align:left; border:0; background:none; color:var(--text); padding:5px 8px; border-radius:6px; font:inherit; cursor:pointer; }
  .list button:hover { background:var(--bg); } .list small { color:var(--muted); }
  .actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px; }
  .actions input { flex:1 1 280px; padding:7px 10px; border:1px solid var(--line); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; }
  .actions button { padding:7px 12px; border:1px solid var(--line); border-radius:6px; background:var(--panel); color:var(--text); font:inherit; cursor:pointer; }
  .actions button.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  .actions button.danger { border-color:var(--bad); color:var(--bad); }
  .actions button:disabled { opacity:.45; cursor:not-allowed; }
</style></head><body>
<header><h1>Factory control centre</h1><span id="project" class="muted"></span><span id="running" class="badge">idle</span><span id="message" class="muted"></span></header>
<nav id="tabs"></nav>
<main>
  <section id="status">
    <div class="card"><h2>Start a line of work</h2>
      <div class="actions">
        <input id="text" placeholder="What do you want built, or what is wrong, in a sentence?" aria-label="Request">
        <button data-action="feature" class="primary">New feature</button><button data-action="fix">Fix a bug</button><button data-action="idea">Idea only</button>
        <button data-action="stop" class="danger">Stop</button>
      </div>
      <p class="muted" id="check"></p></div>
    <div class="card"><h2>Lines of work</h2><table id="lines"></table></div>
    <div class="card"><h2 id="line-name">No line selected</h2>
      <div class="actions"><button data-action="plan">Plan this line</button><button data-action="build">Build this line</button></div>
      <div class="grid" id="documents"></div></div>
    <div class="card"><h2>Tickets of this line</h2><table id="tickets"></table></div>
    <div class="card"><h2>Latest run <span id="latest" class="muted"></span></h2><pre id="events"></pre></div>
  </section>
  <section id="manager">
    <div class="card"><h2>Ask the manager</h2>
      <p class="muted">It answers from the work folders and the code, changes nothing, and names the next step.</p>
      <div class="actions"><input id="question" placeholder="What does the greeting do with an empty name, and why?" aria-label="Question"><button data-action="ask" class="primary">Ask</button></div>
      <pre id="answer"></pre>
      <div class="actions" id="follow"></div></div>
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
const tabs = ['status', 'manager', 'artifacts', 'logs', 'context'];
let current = 'status';
let chosen = '';

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
function card(title, rows) {
  const box = el('div', undefined, 'card');
  box.append(el('h2', title));
  for (const [text, className] of rows) box.append(el('div', text, className));
  return box;
}
async function send(action, text) {
  const response = await api('/api/action', { method: 'POST', body: JSON.stringify({ action, text, line: chosen }) });
  $('message').textContent = await response.text();
  refresh();
}
async function refresh() {
  const response = await api('/api/state?line=' + encodeURIComponent(chosen));
  if (!response.ok) { $('message').textContent = 'Not authorised. Open the address the panel printed, with its token.'; return; }
  const state = await response.json();
  $('project').textContent = state.project + ' · factory ' + state.version;
  $('running').textContent = state.running ? 'running: ' + state.running.command : 'idle';
  $('running').className = 'badge' + (state.running ? ' on' : '');
  for (const button of document.querySelectorAll('[data-action]')) button.disabled = button.dataset.action === 'stop' ? !state.running : Boolean(state.running);
  $('check').textContent = 'Check command: ' + (state.checkOverride ? state.checkOverride + ' (override, set where the panel was started)' : state.check || 'not known yet');

  const table = $('lines'); table.replaceChildren();
  for (const line of state.lines) {
    const row = el('tr', undefined, 'pick' + (line.dir === state.line ? ' chosen' : ''));
    row.append(el('td', line.number), el('td', line.kind, line.kind === 'bug' ? 'warn' : 'muted'), el('td', line.request || line.name),
      el('td', line.stage, line.stage === 'accepted' ? 'good' : line.stage === 'blocked' ? 'bad' : 'muted'));
    row.onclick = () => { chosen = line.dir; refresh(); if (current === 'artifacts') loadArtifacts(); };
    table.append(row);
  }
  if (!state.lines.length) table.append(el('tr', 'No lines of work yet. Type what you want above and press New feature.', 'muted'));

  $('line-name').textContent = state.line ? state.line : 'No line selected';
  const documents = $('documents'); documents.replaceChildren();
  if (state.line) {
    documents.append(card('Idea', state.idea ? [[state.idea.assumptions + ' assumptions, ' + state.idea.undecided.length + ' undecided'], ['review ' + state.idea.review, tone(state.idea.review)], ...state.idea.undecided.map((item) => [item, 'warn'])] : [['none yet', 'muted']]));
    documents.append(card('Stories', state.stories ? [[state.stories.status + ', ' + state.stories.count + ' stories'], ['review ' + state.stories.review, tone(state.stories.review)], ...state.stories.questions.map((item) => [item, 'warn'])] : [['none yet', 'muted']]));
    documents.append(card('Tickets', [[state.tickets.filter((t) => t.status === 'done').length + ' done, ' + state.tickets.filter((t) => t.status === 'todo').length + ' to do, ' + state.tickets.filter((t) => t.status === 'blocked').length + ' blocked'], ['review ' + state.ticketReview, tone(state.ticketReview)]]));
    documents.append(card('Audit and documentation', [[state.acceptance === 'not reviewed' ? 'not audited yet' : state.acceptance === 'passed' ? 'accepted against the idea' : 'gaps found', tone(state.acceptance)], [state.documented ? 'documented' : 'not documented yet', state.documented ? 'good' : 'muted']]));
  }
  const board = $('tickets'); board.replaceChildren();
  for (const ticket of state.tickets) {
    const row = el('tr');
    row.append(el('td', ticket.status, ticket.status === 'done' ? 'good' : ticket.status === 'blocked' ? 'bad' : 'muted'), el('td', ticket.title), el('td', ticket.lines + ' acceptance lines', 'muted'));
    board.append(row);
  }
  if (!state.tickets.length) board.append(el('tr', 'No tickets yet.', 'muted'));
  $('latest').textContent = state.latestRun;
  $('events').textContent = state.events.join('\\n') || 'No run yet.';
  $('console').textContent = state.console || 'Nothing started from this page yet.';

  $('answer').textContent = state.answer || 'No question asked yet.';
  const follow = $('follow'); follow.replaceChildren();
  const next = state.answer.match(/^Next: factory (fix|run) "(.*)"\\s*$/m);
  if (next) {
    const button = el('button', (next[1] === 'fix' ? 'Start this fix: ' : 'Start this feature: ') + next[2]);
    button.disabled = Boolean(state.running);
    button.onclick = () => send(next[1] === 'fix' ? 'fix' : 'feature', next[2]);
    follow.append(button);
  }
}
async function loadArtifacts() {
  const state = await (await api('/api/state?line=' + encodeURIComponent(chosen))).json();
  const items = await (await api('/api/artifacts?line=' + encodeURIComponent(state.line))).json();
  const box = $('artifact-list'); box.replaceChildren();
  box.append(el('div', state.line || 'No line selected', 'muted'));
  for (const item of items) {
    const button = el('button', item.path.replace(state.line + '/', ''));
    button.append(el('small', '  ' + item.bytes + ' chars'));
    button.onclick = () => view(item.path, 'artifact-name', 'artifact-body');
    box.append(button);
  }
  if (!items.length) box.append(el('div', 'Nothing produced yet. Pick a line on the Status tab.', 'muted'));
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
for (const button of document.querySelectorAll('[data-action]')) button.onclick = () =>
  send(button.dataset.action, button.dataset.action === 'ask' ? $('question').value : $('text').value);
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

  const line = url.searchParams.get('line') ?? '';
  if (url.pathname === '/api/state') return send(200, state(line));
  if (url.pathname === '/api/artifacts') return send(200, artifacts(line));
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
        const { action, text, line: onLine } = JSON.parse(body || '{}');
        send(200, act(action, text, onLine), 'text/plain');
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
