'use strict';
const { decide } = require('../lib/guard');
const assert = require('assert');
const M = { agent_type: 'marcus' };
const bash = (c, extra) => decide(Object.assign({ tool_name: 'Bash', tool_input: { command: c } }, extra || M));
const ok = c => assert.strictEqual(bash(c), null, 'should allow: ' + c);
const no = c => assert.ok(bash(c), 'should block: ' + c);

// allowed
ok('ls "C:\\Projects\\demo" 2>/dev/null && echo HAS_FILES || echo EMPTY');
ok('git status --short');
ok('git rev-parse factory/task-1');
ok('git merge factory/task-1');
ok('mkdir -p .doombots/reports');
ok('echo \'{"type":"task.assigned","agent":"builder"}\' >> .doombots/events.jsonl');
ok('printf "%s\\n" "{\\"a\\":1}" >> .doombots/events.jsonl');
ok('cat .doombots/state.json');
ok('git log --oneline -20 | head -5');
ok('git diff --shortstat main...factory/x');

// blocked
no('python app.py');
no('node -e "require(\'fs\').writeFileSync(\'a.js\',\'x\')"');
no('echo hi > app.py');
no('echo hi >> src/main.py');
no('cat > app.py');
no('npm test');
no('rm -rf node_modules');
no('sed -i s/a/b/ app.py');
no('git push origin main');
no('git push --force');
no('git reset --hard HEAD~1');
no('git clean -fd');
no('echo $(whoami)');
no('echo `id`');
no('ls && python x.py');
no('ls; rm x');
no('ls | tee out.txt');
no('find . -name x -delete');
no('mkdir src');
no('cat <<EOF > app.py');
no('FOO=1 ls');
no('ls &');

// tools
assert.ok(decide(Object.assign({ tool_name: 'Write', tool_input: { file_path: 'app.py' } }, M)));
assert.ok(decide(Object.assign({ tool_name: 'Edit', tool_input: {} }, M)));
assert.ok(decide({ tool_name: 'Write', tool_input: {} }));                        // main thread, no agent fields
assert.strictEqual(decide({ tool_name: 'Read', tool_input: {}, agent_type: 'marcus' }), null);
assert.strictEqual(decide({ tool_name: 'Agent', tool_input: {}, agent_type: 'marcus' }), null);

// subagents are free
assert.strictEqual(decide({ tool_name: 'Write', tool_input: {}, agent_type: 'builder', agent_id: 'a1' }), null);
assert.strictEqual(decide({ tool_name: 'Bash', tool_input: { command: 'python app.py' }, agent_type: 'builder', agent_id: 'a1' }), null);
assert.strictEqual(decide({ tool_name: 'Bash', tool_input: { command: 'npm test' }, agent_id: 'a2' }), null);

console.log('guard tests passed');
