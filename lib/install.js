'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const CLAUDE_DIR = process.env.DOOM_CLAUDE_DIR || path.join(os.homedir(), '.claude');
const DOOM_HOME = path.join(CLAUDE_DIR, 'doombots');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function version() { return require('../package.json').version; }

function isInstalled() {
  try {
    return fs.existsSync(path.join(AGENTS_DIR, 'marcus.md')) &&
      fs.readFileSync(path.join(DOOM_HOME, 'VERSION'), 'utf8').trim() === version();
  } catch (e) { return false; }
}

function install(log = console.log) {
  const homeFwd = DOOM_HOME.replace(/\\/g, '/');
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(path.join(ROOT, 'agents'))) {
    if (!f.endsWith('.md')) continue;
    const txt = fs.readFileSync(path.join(ROOT, 'agents', f), 'utf8').split('{{DOOM_HOME}}').join(homeFwd);
    fs.writeFileSync(path.join(AGENTS_DIR, f), txt);
    n++;
  }
  copyDir(path.join(ROOT, 'skills'), path.join(DOOM_HOME, 'skills'));
  fs.writeFileSync(path.join(DOOM_HOME, 'VERSION'), version() + '\n');
  log('Installed ' + n + ' agents into ' + AGENTS_DIR);
  log('Installed skill packs into ' + path.join(DOOM_HOME, 'skills'));
  return n;
}

module.exports = { install, isInstalled, DOOM_HOME, AGENTS_DIR };
