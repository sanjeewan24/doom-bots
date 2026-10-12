'use strict';
// Scripted run for the visual views, so you can watch the workforce without spending tokens.
// Events go through the same director as real ones; chat and files are not touched.
(function (root) {
  var timers = [], running = false, onEnd = null;
  var n = 0;
  function id() { return 'demo' + (++n); }

  function script(kind) {
    var T = [], t = 0;
    function at(ms, ev) { T.push([ms, ev]); }
    function tool(ms, agent, name, summary) { at(ms, { t: 'tool', agent: agent, name: name, summary: summary }); }
    var i;

    at(0, { t: 'chat', role: 'user', agent: 'you', text: 'Fix the login bug: the session expires right after sign in.' });
    at(500, { t: 'chat', role: 'marcus', agent: 'marcus', text: 'Bug fix. Route: Scout maps it, Sage writes the fix spec, Forge fixes, four reviewers check, Themis decides.' });
    tool(1100, 'marcus', 'Bash', 'git status --short');

    // Scout
    var sc = id(); at(1800, { t: 'agent', id: sc, agent: 'codebase-mapper', from: 'marcus', state: 'start', desc: 'Map the codebase, find the login bug' });
    tool(2600, 'codebase-mapper', 'Glob', '**/*.py'); tool(3300, 'codebase-mapper', 'Read', 'auth/session.py'); tool(4000, 'codebase-mapper', 'Grep', 'expires');
    at(4500, { t: 'chat', role: 'agent', agent: 'codebase-mapper', text: 'Found it. `session.py:42` sets expiry in seconds but compares with milliseconds.' });
    tool(5200, 'codebase-mapper', 'Write', '.doombots/BUG_BRIEF.md');
    at(6000, { t: 'agent', id: sc, agent: 'codebase-mapper', state: 'done', summary: 'BUG_BRIEF.md written. Suspect: auth/session.py:42. 2 risk zones.' });

    // Sage
    var sg = id(); at(6600, { t: 'agent', id: sg, agent: 'spec-writer', from: 'marcus', state: 'start', desc: 'Write the fix spec' });
    tool(7400, 'spec-writer', 'Read', '.doombots/BUG_BRIEF.md'); tool(8200, 'spec-writer', 'Write', '.doombots/specs/FIX_SPEC.md'); tool(9000, 'spec-writer', 'Write', '.doombots/specs/IMPLEMENTATION_PLAN.md');
    at(9800, { t: 'agent', id: sg, agent: 'spec-writer', state: 'done', summary: 'FIX_SPEC.md and a one-task plan written. 0 assumptions.' });

    // Forge
    var f1 = id(); at(10400, { t: 'agent', id: f1, agent: 'builder', from: 'marcus', state: 'start', desc: 'Fix the expiry unit bug on factory/fix-login' });
    tool(11200, 'builder', 'Bash', 'git checkout -b factory/fix-login'); tool(12000, 'builder', 'Write', 'tests/test_session.py'); tool(12800, 'builder', 'Edit', 'auth/session.py'); tool(13600, 'builder', 'Bash', 'pytest -q');
    at(14400, { t: 'agent', id: f1, agent: 'builder', state: 'done', summary: 'Branch factory/fix-login. Tests pass, lint clean.' });

    // Reviewers round 1
    var r = { 'security-reviewer': id(), 'ux-reviewer': id(), 'ui-design-reviewer': id(), 'code-reviewer': id() };
    var order = ['security-reviewer', 'ux-reviewer', 'ui-design-reviewer', 'code-reviewer'];
    order.forEach(function (a, k) { at(15000 + k * 250, { t: 'agent', id: r[a], agent: a, from: 'marcus', state: 'start', desc: 'Review factory/fix-login' }); });
    tool(16000, 'security-reviewer', 'Grep', 'token|secret|expires'); tool(16300, 'ux-reviewer', 'Read', '.doombots/specs/APP_FLOW.md'); tool(16600, 'ui-design-reviewer', 'Read', '.doombots/specs/FRONTEND_GUIDELINES.md'); tool(16900, 'code-reviewer', 'Bash', 'pytest -q');
    tool(18000, 'security-reviewer', 'Read', 'auth/session.py'); tool(18400, 'code-reviewer', 'Read', 'tests/test_session.py');
    at(19400, { t: 'agent', id: r['security-reviewer'], agent: 'security-reviewer', state: 'done', summary: 'PASS. No findings. SHA abc1234.' });
    at(19900, { t: 'agent', id: r['ux-reviewer'], agent: 'ux-reviewer', state: 'done', summary: 'PASS. SHA abc1234.' });
    at(20400, { t: 'agent', id: r['ui-design-reviewer'], agent: 'ui-design-reviewer', state: 'done', summary: 'PASS. SHA abc1234.' });
    at(21200, { t: 'chat', role: 'agent', agent: 'code-reviewer', text: 'The new test only covers the happy path. No test for a token that is already expired.' });
    at(22000, { t: 'agent', id: r['code-reviewer'], agent: 'code-reviewer', state: 'done', summary: 'CHANGES. CODE-001 missing expired-token test. SHA abc1234.' });

    // Fix loop
    var f2 = id(); at(25500, { t: 'agent', id: f2, agent: 'builder', from: 'marcus', state: 'start', desc: 'Fix CODE-001' });
    tool(26300, 'builder', 'Edit', 'tests/test_session.py'); tool(27100, 'builder', 'Bash', 'pytest -q'); tool(27900, 'builder', 'Bash', 'git commit -m "fix-login: expired token test"');
    at(28700, { t: 'agent', id: f2, agent: 'builder', state: 'done', summary: 'CODE-001 fixed. 7 tests pass.' });

    // Reviewers round 2
    var r2 = { 'security-reviewer': id(), 'ux-reviewer': id(), 'ui-design-reviewer': id(), 'code-reviewer': id() };
    order.forEach(function (a, k) { at(29300 + k * 250, { t: 'agent', id: r2[a], agent: a, from: 'marcus', state: 'start', desc: 'Re-review on the new commit' }); });
    tool(30300, 'code-reviewer', 'Bash', 'pytest -q'); tool(30700, 'security-reviewer', 'Read', 'auth/session.py');
    order.forEach(function (a, k) { at(32500 + k * 450, { t: 'agent', id: r2[a], agent: a, state: 'done', summary: 'PASS. SHA def5678.' }); });

    // Themis
    var th = id(); at(35200, { t: 'agent', id: th, agent: 'approver', from: 'marcus', state: 'start', desc: 'Decide on factory/fix-login' });
    tool(36000, 'approver', 'Bash', 'git rev-parse factory/fix-login'); tool(36800, 'approver', 'Read', '.doombots/reports/code-review-fix-login.md'); tool(37600, 'approver', 'Bash', 'git diff --shortstat main...factory/fix-login'); tool(38400, 'approver', 'Write', '.doombots/reports/approval-fix-login.md');
    if (kind === 'escalate') {
      at(39400, { t: 'agent', id: th, agent: 'approver', state: 'done', summary: 'ESCALATE. Touches authentication. Human digest written.' });
      at(40200, { t: 'chat', role: 'marcus', agent: 'marcus', text: 'Themis escalated: this change touches authentication. Press Approve to merge, or Reject with a reason.' });
      at(42000, { t: 'turn', ms: 41000, cost: 0 });
      at(46000, { t: 'chat', role: 'user', agent: 'you', text: 'approve' });
      tool(47200, 'marcus', 'Bash', 'git merge factory/fix-login');
      at(50000, { t: 'chat', role: 'marcus', agent: 'marcus', text: 'Merged factory/fix-login into main.' });
      at(51500, { t: 'turn', ms: 5000, cost: 0 });
    } else {
      at(39400, { t: 'agent', id: th, agent: 'approver', state: 'done', summary: 'LOW_RISK_APPROVE. 2 files, 14 lines, no risk zones.' });
      tool(40800, 'marcus', 'Bash', 'git merge factory/fix-login');
      at(43500, { t: 'chat', role: 'marcus', agent: 'marcus', text: 'Merged factory/fix-login into main. Both reviewers rounds green, Themis approved.' });
      at(45000, { t: 'turn', ms: 45000, cost: 0 });
    }
    return T;
  }

  function stop(manual) { timers.forEach(clearTimeout); timers = []; if (running) { running = false; root.Doom.demo = false; if (manual === true) root.Doom.reset(); if (onEnd) { var f = onEnd; onEnd = null; f(); } } }

  function run(kind, end) {
    stop(false);
    var D = root.Doom;
    D.reset(); D.demo = true; running = true; onEnd = end || null;
    var T = script(kind || 'merge'), last = 0;
    T.forEach(function (p) { last = Math.max(last, p[0]); timers.push(setTimeout(function () { D.feed(p[1]); }, p[0])); });
    timers.push(setTimeout(function () { stop(false); }, last + 6000));
  }

  root.Demo = { run: run, stop: stop, isRunning: function () { return running; } };
})(window);
