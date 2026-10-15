import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Color from 'colorjs.io';
import { singleWrapUnitHsl } from '../src/research-models.mjs';

const run = new URL('../research/2026-10-15/variables-json/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, run), 'utf8'));
const value = variable => Object.values(variable.values)[0];
const rgb = rgba => [rgba.r, rgba.g, rgba.b];
const hex = channels => '#' + channels.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
function flatten(tree, prefix = []) {
    const entries = [];
    for (const [name, node] of Object.entries(tree)) {
        if (name.startsWith('$')) continue;
        const path = [...prefix, name];
        if (node && typeof node === 'object' && '$value' in node) entries.push([path.join('/'), node]);
        else if (node && typeof node === 'object') entries.push(...flatten(node, path));
    }
    return new Map(entries);
}
function variableMap(state) { return new Map(state.variables.map(v => [v.name, v])); }
function resolve(state, variable) {
    const current = value(variable);
    return current.type === 'VARIABLE_ALIAS'
        ? resolve(state, state.variables.find(v => v.id === current.id)) : current;
}
for (const file of [...read('manifest.json').files, ...read('manifest.json').sourceFiles]) {
    const bytes = fs.readFileSync(new URL(file.path, run));
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const source = read('evidence/export-baseline.json');
assert.deepEqual(read('evidence/source-preservation.json').changed, []);
assert.ok(fs.readFileSync(new URL('evidence/source-profile.txt', run), 'utf8').includes('Assign to Display P3, Value: 1'));
const exported = new Map([
    ...flatten(read('exports/forward.tokens.json')),
    ...flatten(read('exports/inverse-export.tokens.json'))
]);
assert.equal(exported.size, 28);
for (const variable of source.variables) {
    const token = exported.get(variable.name);
    assert.ok(token, variable.name);
    assert.equal(token.$extensions['com.figma.variableId'], variable.id);
    const stored = value(variable);
    if (stored.type === 'VARIABLE_ALIAS') {
        const target = source.variables.find(v => v.id === stored.id);
        assert.equal(token.$value, '{' + target.name.replaceAll('/', '.') + '}');
    } else {
        assert.equal(token.$value.colorSpace, 'srgb');
        assert.deepEqual(token.$value.components, rgb(stored));
        assert.equal(token.$value.alpha, stored.a);
        assert.equal(token.$value.hex, hex(rgb(stored)));
    }
}
assert.deepEqual(read('exports/inverse-export.tokens.json'), read('exports/inverse-export-repeat.tokens.json'));
assert.deepEqual(read('exports/inverse-export.tokens.json'), read('../../2026-10-14/figma/Mode 1.tokens.json'));
const p3 = read('evidence/p3-final-state.json');
const srgb = read('evidence/srgb-final-state.json');
assert.deepEqual(read('evidence/p3-after-controlled-repeat.json').variables, p3.variables.map(v => ({id: v.id, name: v.name, values: v.values})));
assert.notEqual(p3.fileKey, srgb.fileKey);
assert.deepEqual(p3.variables, srgb.variables);
assert.equal(p3.variables.length, 57);
const registry = read('test-registry.json').tests;
assert.equal(registry.length, 114);
assert.equal(new Set(registry.map(t => t.testId)).size, 114);
const probes = read('imports/probes.tokens.json');
const skipped = ['srgb-hex-only', 'legacy-hex-string', 'p3-components-only', 'p3-with-hex',
    'oklch-components-only', 'oklch-with-hex', 'srgb-linear-with-hex', 'srgb-outside-range',
    'srgb-none-channel', 'missing-color-space', 'unknown-space-with-hex'];
const sentinel = read('imports/seed-config.json').sentinel;
for (const profile of ['p3', 'srgb']) {
    const state = profile === 'p3' ? p3 : srgb;
    const byName = variableMap(state);
    const seed = read('evidence/' + (profile === 'p3' ? 'p3Seed' : 'srgbSeed') + '.json');
    for (const initial of seed.variables) assert.equal(byName.get(initial.name).id, initial.id);
    for (const original of source.variables) {
        const current = byName.get(original.name);
        assert.deepEqual(resolve(state, current), resolve(source, original), original.name);
        assert.notEqual(current.id, original.id);
        const sourceValue = value(original);
        if (sourceValue.type === 'VARIABLE_ALIAS') {
            const targetName = source.variables.find(v => v.id === sourceValue.id).name;
            assert.deepEqual(value(current), { type: 'VARIABLE_ALIAS', id: byName.get(targetName).id });
        }
    }
    for (const name of skipped) assert.deepEqual(value(byName.get(name)), sentinel, name);
    for (const [name, token] of Object.entries(probes)) {
        if (skipped.includes(name) || token.$value.colorSpace === 'hsl' || typeof token.$value === 'string') continue;
        const actual = value(byName.get(name));
        token.$value.components.forEach((c, i) => assert.ok(Math.abs(c - rgb(actual)[i]) < 2e-7, name));
        assert.equal(actual.a, token.$value.alpha ?? 1);
    }
    assert.deepEqual(value(byName.get('srgb-alias')), { type: 'VARIABLE_ALIAS', id: byName.get('srgb-components-only').id });
    assert.deepEqual(value(byName.get('srgb-with-original-id')), { r: 1, g: 0, b: 0, a: 1 });
    const roundtrip = flatten(read('exports/' + profile + '-probes-reexport.tokens.json'));
    assert.equal(roundtrip.size, 24);
    for (const [name, token] of roundtrip) {
        const actual = value(byName.get(name));
        if (actual.type === 'VARIABLE_ALIAS') assert.equal(token.$value, '{srgb-components-only}');
        else {
            assert.equal(token.$value.colorSpace, 'srgb');
            assert.deepEqual(token.$value.components, rgb(actual));
            assert.equal(token.$value.alpha, actual.a);
            assert.equal(token.$value.hex, hex(rgb(actual)));
        }
    }
    const before = read('exports/' + profile + '-hsl-immediate.tokens.json');
    const after = read('exports/' + profile + '-hsl-after-reload.tokens.json');
    assert.deepEqual(before['degrees-percent'].$value.components, [1480, 1480, 1480]);
    assert.equal(before['degrees-percent'].$value.hex, '#5C2385C2385C238');
    assert.deepEqual(before['gray-percent-l'].$value.components, [50, 50, 50]);
    assert.equal(before['gray-percent-l'].$value.hex, '#31CE31CE31CE');
    for (const name of ['degrees-percent', 'gray-percent-l']) {
        assert.deepEqual(after[name].$value.components, [1, 1, 1]);
        assert.equal(after[name].$value.hex, '#FFFFFF');
    }
    const hslInputs = read('imports/hsl-units.tokens.json');
    assert.deepEqual(Object.keys(before).filter(name => !name.startsWith('$')).sort(), Object.keys(hslInputs).sort());
    assert.deepEqual(Object.keys(after).filter(name => !name.startsWith('$')).sort(), Object.keys(hslInputs).sort());
    for (const [name, token] of Object.entries(hslInputs)) {
        const predicted = singleWrapUnitHsl(token.$value.components);
        const immediate = before[name].$value.components;
        predicted.forEach((c, i) => assert.ok(Math.abs(c - immediate[i]) < 2e-7, profile + '/' + name + ': HSL candidate'));
        assert.equal(before[name].$value.hex, hex(immediate), name);
        const reloaded = immediate.map(c => Math.max(0, Math.min(1, c)));
        assert.deepEqual(after[name].$value.components, reloaded, name + ': reload');
        assert.equal(after[name].$value.hex, hex(reloaded), name);
        assert.deepEqual(rgb(value(byName.get(name))), reloaded, name + ': final state');
    }
    const layers = read('evidence/' + profile + '-layers.json');
    assert.equal(layers.specimens.length, 57);
    assert.equal(new Set(layers.specimens.map(n => n.id)).size, 57);
    for (const layer of layers.specimens) assert.equal(byName.get(layer.name).id, layer.variableId);
    const hierarchy = read('evidence/' + profile + '-hierarchy.json');
    assert.equal(hierarchy.nodes.length, 181);
    for (const layer of layers.specimens) assert.equal(hierarchy.nodes.find(n => n.id === layer.id).type, 'RECTANGLE');
    for (const entry of registry.filter(t => t.profile === (profile === 'p3' ? 'Display-P3' : 'sRGB'))) {
        assert.equal(entry.fileKey, state.fileKey);
        assert.equal(entry.variableId, byName.get(entry.variableName).id);
        assert.deepEqual(entry.expectedAfterReload, value(byName.get(entry.variableName)));
        assert.ok(layers.specimens.some(n => n.id === entry.nodeId && n.variableId === entry.variableId));
    }
    const copy = read('metadata.json').files[profile];
    const bytes = fs.readFileSync(new URL(copy.localFile, run));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), copy.sha256);
    const profileText = fs.readFileSync(new URL('evidence/' + profile + '-profile.txt', run), 'utf8');
    assert.ok(profileText.includes(profile === 'p3' ? 'Assign to Display P3, Value: 1' : 'Assign to sRGB, Value: 1'));
    const uiText = fs.readFileSync(new URL('evidence/' + (profile === 'p3' ? 'p3-probes-reset-reimport.txt' : 'srgb-probes-import.txt'), run), 'utf8');
    assert.ok(uiText.includes('13 variables updated. Encountered errors importing 11 tokens.'));
}
const overlay = value(variableMap(p3).get('overlay-p3-hex'));
assert.ok(fs.readFileSync(new URL('evidence/p3-probes-import-repeat.txt', run), 'utf8').includes('9 variables updated. Encountered errors importing 11 tokens.'));
assert.ok(new Color('p3', rgb(overlay)).deltaE(new Color('srgb', rgb(overlay)), 'OK') > .008);
console.log('Archive consistency: 28 source tokens; 24 probes and 5 HSL records per profile checked.');
console.log('Candidate-model agreement: single-wrap unit HSL matches all 5 immediate results in each profile; reload clipping checked separately.');
console.log('Archive consistency: 57 variables and 57 layer IDs per file; export fields, .fig hashes and aliases checked.');
console.log('This command checks archived evidence; it does not run Figma UI or reimport .fig files.');
