import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateFlow } from '../scripts/validate-flow.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const c = '00000000-0000-4000-8000-000000000003';
const advanced = () => ({
  name: 'Offline fixture', enabled: false,
  cards: {
    [a]: { type: 'start', x: 0, y: 0, outputSuccess: [b] },
    [b]: { type: 'action', id: 'fixture:action', args: {}, x: 200, y: 0 },
  },
});
test('valid standard flow does not require card UUIDs', () => {
  assert.deepEqual(validateFlow({ name: 'Fixture', trigger: { id: 'fixture:trigger', args: {} },
    conditions: [], actions: [{ id: 'fixture:action', args: {}, group: 'then' }] }), []);
});
test('valid advanced flow', () => assert.deepEqual(validateFlow(advanced()), []));
test('decorative notes need not be reachable', () => {
  const f = advanced();
  f.cards[c] = { type: 'note', value: 'A note', color: 'yellow', x: 0, y: 200 };
  assert.deepEqual(validateFlow(f), []);
});
test('dangling outputs fail', () => {
  const f = advanced(); f.cards[a].outputSuccess = [c];
  assert.match(validateFlow(f).join('\n'), /missing output target/);
});
test('unsupported source outputs fail', () => {
  const f = advanced(); f.cards[a].outputTrue = [b];
  assert.match(validateFlow(f).join('\n'), /unsupported outputTrue/);
});
test('unreachable actions fail', () => {
  const f = advanced(); delete f.cards[a].outputSuccess;
  assert.match(validateFlow(f).join('\n'), /unreachable/);
});
test('join inputs connect executable cards', () => {
  const f = advanced(); delete f.cards[a].outputSuccess;
  f.cards[b] = { type: 'all', x: 200, y: 0, input: [a + '::outputSuccess'] };
  assert.deepEqual(validateFlow(f), []);
  f.cards[b].input = [a + '::outputTrue'];
  assert.match(validateFlow(f).join('\n'), /invalid input reference/);
});
test('negative delays and missing args fail', () => {
  const f = advanced(); f.cards[b] = { type: 'delay', x: 200, y: 0,
    args: { delay: { number: '-1', multiplier: 1 } } };
  assert.match(validateFlow(f).join('\n'), /invalid delay/);
  delete f.cards[b].args;
  assert.match(validateFlow(f).join('\n'), /invalid delay/);
});
test('malformed objects and types return errors rather than crash', () => {
  for (const value of [null, [], {}, { name: 'X', cards: [] },
    { name: 'X', cards: { [a]: null } }, { name: 'X', cards: { [a]: { type: '__proto__' } } }]) {
    assert.ok(validateFlow(value).length);
  }
});
test('mixed standard and advanced payloads fail', () => {
  const f = advanced(); f.trigger = { id: 'fixture:trigger', args: {} };
  assert.match(validateFlow(f).join('\n'), /mix standard/);
});
test('CLI usage and invalid JSON return nonzero', () => {
  const script = join(root, 'scripts', 'validate-flow.mjs');
  assert.equal(spawnSync(process.execPath, [script], { encoding: 'utf8' }).status, 1);
  assert.equal(spawnSync(process.execPath, [script, join(root, 'README.md')], { encoding: 'utf8' }).status, 1);
});
test('upstream skeletons parse but cannot pass with placeholders', () => {
  const dir = join(root, 'assets', 'flow-templates');
  for (const name of readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const f = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    assert.match(validateFlow(f).join('\n'), /unresolved placeholder/, name);
  }
});
test('skill metadata, packaged references and host boundary are coherent', () => {
  const text = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const match = text.match(/^---\nname: ([a-z0-9-]+)\ndescription: ([^\n]+)\n---\n/);
  assert.ok(match, 'Expected simple name/description frontmatter');
  assert.equal(match[1], 'homey-cli');
  assert.equal(dirname(join(root, 'SKILL.md')).split(/[\\/]/).pop(), match[1]);
  assert.ok(match[2].length <= 1024 && !/[<>]/.test(match[2]));
  for (const ref of text.matchAll(/\]\((references\/[^)]+)\)/g)) {
    assert.ok(existsSync(join(root, ref[1])), ref[1]);
  }
  assert.ok(text.includes('--homey-id'));
  assert.ok(text.includes('local shell'));
});
