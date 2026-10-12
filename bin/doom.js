#!/usr/bin/env node
'use strict';
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { install, isInstalled } = require('../lib/install');
const { createApp } = require('../lib/server');

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

if (has('-h') || has('--help')) {
  console.log([
    'DOOM-Bots: run from any project folder.',
    '',
    '  doom              start Marcus and open the chat UI for this folder',
    '  doom install      (re)install agents and skill packs into ~/.claude',
    '  doom --new        start a fresh Marcus session (do not resume the last one)',
    '  doom --safe       do not use yolo mode (Claude Code will ask for permissions)',
    '  doom --port N     start looking for a free port at N (default 4777)',
    '  doom --no-open    do not open the browser'
  ].join('\n'));
  process.exit(0);
}

if (argv[0] === 'install') { install(); process.exit(0); }

if (!isInstalled()) { console.log('First run: installing agents and skills…'); install(); }

const cwd = process.cwd();
const yolo = !has('--safe');
const app = createApp({ cwd, yolo, fresh: has('--new'), bin: process.env.DOOM_CLAUDE_BIN });

app.listen(parseInt(val('--port') || '4777', 10)).then(port => {
  const url = 'http://127.0.0.1:' + port + '/?t=' + app.token;
  console.log('');
  console.log('  DOOM-Bots');
  console.log('  project : ' + cwd);
  console.log('  mode    : ' + (yolo ? 'YOLO (no permission prompts)' : 'safe (permission prompts)'));
  console.log('  open    : ' + url);
  console.log('  stop    : Ctrl+C');
  console.log('');
  app.session.start();
  if (!has('--no-open')) openBrowser(url);
}).catch(e => { console.error('Could not start server: ' + e.message); process.exit(1); });

function openBrowser(url) {
  try {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '""', url.replace(/&/g, '^&')], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) { /* user can open the URL by hand */ }
}

function bye() { app.close(); setTimeout(() => process.exit(0), 600); }
process.on('SIGINT', bye);
process.on('SIGTERM', bye);
