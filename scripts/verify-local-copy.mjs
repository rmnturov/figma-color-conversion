import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const run = new URL('../research/2026-10-14/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, run), 'utf8'));
const meta = read('figma/local-copy.json');
const bytes = fs.readFileSync(new URL('figma/' + meta.file, run));
assert.equal(bytes.length, meta.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'), meta.sha256);
assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304');
const hierarchy = read('evidence/original-node-hierarchy.json');
const source = read('evidence/export-source-variables.json');
const restored = read('evidence/restored-file-state.json');
const original = read('evidence/figma-state.json');
assert.notEqual(source.fileKey, restored.fileKey);
assert.deepEqual(restored.nodes, hierarchy.nodes);
assert.equal(restored.nodes.length, 110);
assert.deepEqual(restored.collections, source.collections);
assert.deepEqual(restored.variables, source.variables);
assert.deepEqual(restored.variables, original.variables);
assert.equal(restored.variables.length, 28);
assert.equal(restored.rectangles.length, 32);
for (const node of original.nodes) {
    const actual = restored.rectangles.find(n => n.id === node.id);
    assert.ok(actual, 'Missing restored layer: ' + node.id);
    assert.equal(actual.name, node.name);
    assert.equal(actual.opacity, node.opacity);
    assert.deepEqual(actual.fills, [node.fill]);
}
const registry = read('node-registry.json');
assert.equal(registry.nodes.length, restored.nodes.length);
const tests = read('test-registry.json').tests;
assert.equal(tests.length, 32);
assert.equal(new Set(tests.map(t => t.testId)).size, tests.length);
assert.equal(new Set(tests.map(t => t.nodeId)).size, 32);
for (const test of tests) {
    const node = registry.nodes.find(n => n.id === test.nodeId);
    assert.ok(node && node.type === 'RECTANGLE', test.testId);
    assert.equal(test.path, node.path);
    if (test.variableId) {
        const variable = source.variables.find(v => v.id === test.variableId);
        assert.ok(variable, test.testId);
        if (test.expectedStoredRGBA) assert.deepEqual(variable.values[test.modeId], test.expectedStoredRGBA);
    }
}
const profile = fs.readFileSync(new URL('evidence/restored-profile.txt', run), 'utf8');
assert.match(profile, /Assign to Display P3, Value: 1/);
assert.match(profile, /Assign to sRGB, Value: 0/);
for (const [name, hex] of [['literal', '#182E6F'], ['variable', '#102F73']]) {
    const snapshot = fs.readFileSync(new URL('evidence/restored-overlay-' + name + '.txt', run), 'utf8');
    assert.ok(snapshot.includes('Click to copy layer name: overlay-' + name));
    assert.ok(snapshot.includes(hex));
    assert.ok(snapshot.includes('color(display-p3 0.1137 0.1765 0.4196)'));
}
console.log('Archive consistency: local .fig SHA-256 matches metadata. Recorded import preserved 110 node IDs, 28 variables and 32 fills.');
console.log('Profile and two Dev Mode observations match. This command does not inspect live Figma or decode canvas.fig.');
