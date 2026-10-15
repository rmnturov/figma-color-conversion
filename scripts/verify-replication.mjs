import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fallbackCandidates } from '../src/research-models.mjs';

const run = new URL('../research/2026-10-15/replication-01/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, run), 'utf8'));
const exists = name => fs.existsSync(new URL(name, run));
const sha = name => createHash('sha256').update(fs.readFileSync(new URL(name, run))).digest('hex');
const expand = hex => (hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex).toUpperCase();
for (const item of read('preregistration-hashes.json').files) assert.equal(sha(item.path), item.sha256, item.path);
for (const item of read('evidence/readings-freeze.json').files) assert.equal(sha(item.path), item.sha256, item.path);
const predictions = read('predictions.json');
const fixtures = read('evidence/p3-fixtures.json');
const initial = read('evidence/p3-initial-state.json');
const final = read('evidence/p3-after-devmode-state.json');
assert.deepEqual(final.nodes, initial.nodes, 'Dev Mode specimen fills preserved');
assert.deepEqual(final.variables, initial.variables, 'Original fixture values and aliases preserved');
const first = read('evidence/devmode-reading-1.json');
const second = read('evidence/devmode-reading-2.json');
assert.equal(first.length, 21);
assert.equal(new Set(first.map(r => r.name)).size, 21);
assert.equal(second.complete, true);
assert.equal(second.readings.length, 21);
const variables = new Map(initial.variables.map(v => [v.name, v]));
const rows = [];
for (const specimen of predictions.specimens) {
    assert.deepEqual(fallbackCandidates(specimen.inputP3), specimen.predictions, specimen.key + ': frozen calculations');
    const stored = Object.values(variables.get('primitive/' + specimen.key).values)[0];
    assert.deepEqual([stored.r, stored.g, stored.b], specimen.inputP3);
    assert.equal(stored.a, 1);
    const primitive = variables.get('primitive/' + specimen.key);
    const semantic = variables.get('semantic/' + specimen.key);
    const role = variables.get('role/' + specimen.key);
    assert.deepEqual(Object.values(semantic.values)[0], { type: 'VARIABLE_ALIAS', id: primitive.id });
    assert.deepEqual(Object.values(role.values)[0], { type: 'VARIABLE_ALIAS', id: semantic.id });
    for (const variant of ['literal', 'variable', 'alias2']) {
        const name = specimen.key + '-' + variant;
        const fixture = fixtures.records.find(r => r.name === name);
        const node = initial.nodes.find(n => n.id === fixture.id);
        assert.equal(node.name, name);
        assert.deepEqual(Object.values(node.fills[0].color), specimen.inputP3);
        if (variant !== 'literal') {
            assert.equal(node.fills[0].boundVariables.color.id, fixture.variableId);
            assert.equal(fixture.variableId, variables.get((variant === 'variable' ? 'primitive/' : 'role/') + specimen.key).id);
        }
        const actual = first.find(r => r.name === name);
        assert.equal(actual.id, fixture.id);
        const reread = second.readings.find(r => r.name === name);
        assert.equal(sha('evidence/' + reread.image), reread.imageSha256);
        assert.equal(expand(actual.hex), expand(reread.hex), name + ': two readings');
        for (const prefix of ['devmode-', 'second-']) {
            const raw = fs.readFileSync(new URL('evidence/' + prefix + name + '.txt', run), 'utf8');
            assert.ok(raw.includes('Click to copy layer name: ' + name));
            const style = raw.split('container code:Style-inspection-panel')[1]?.split('container colors-inspection-panel')[0];
            assert.ok(style, name + ': CSS Style');
            assert.equal(expand(style.match(/#[0-9a-f]{3,8}\b/i)[0]), expand(actual.hex));
            assert.ok(style.includes('color(display-p3 '), name + ': P3 CSS');
        }
        assert.equal(expand(actual.hex), specimen.predictions.passes[variant === 'literal' ? 0 : 1], name + ': preregistered prediction');
    }
    const observed = expand(first.find(r => r.name === specimen.key + '-variable').hex);
    rows.push({ specimen: specimen.key, newColour: specimen.newColour, observed,
        ...Object.fromEntries(specimen.predictions.passes.map((hex, i) => ['pass' + (i + 1), hex])),
        noIntermediateRounding: specimen.predictions.twoWithoutIntermediateRounding,
        inputRounded: specimen.predictions.inputRoundedThenTwo });
}
const protocol = read('protocol.json');
for (const precision of ['double', 'float32']) {
    const srgbInput = read('imports/' + precision + '-srgb.tokens.json');
    const p3Input = read('imports/' + precision + '-display-p3.tokens.json');
    const normalized = structuredClone(p3Input);
    normalized['color-space-probe'].$value.colorSpace = 'srgb';
    assert.deepEqual(normalized, srgbInput, 'Only colorSpace changes within the pair');
}
let importCount = 0;
const importResults = [];
for (const profile of ['p3', 'srgb']) {
    const profileText = fs.readFileSync(new URL('evidence/' + profile + '-profile.txt', run), 'utf8');
    assert.ok(profileText.includes(profile === 'p3' ? 'Assign to Display P3, Value: 1' : 'Assign to sRGB, Value: 1'));
    let variableId;
    for (let cycle = 1; cycle <= 2; cycle++) {
        for (const trial of protocol.imports) {
            const label = profile + '-cycle' + cycle + '-' + trial.precision + '-' + trial.colorSpace;
            if (!exists('evidence/' + label + '.tokens.json')) continue;
            const token = read('evidence/' + label + '.tokens.json')['color-space-probe'];
            const id = token.$extensions['com.figma.variableId'];
            variableId ??= id;
            assert.equal(id, variableId, label + ': same target ID');
            const beforeToken = 'evidence/' + label + '-before.tokens.json';
            const beforeApi = 'evidence/' + label + '-before.json';
            let before;
            if (exists(beforeToken)) {
                const record = read(beforeToken)['color-space-probe'];
                assert.equal(record.$extensions['com.figma.variableId'], id);
                before = Object.fromEntries(['r', 'g', 'b'].map((c, i) => [c, record.$value.components[i]]));
                before.a = record.$value.alpha;
            } else if (exists(beforeApi)) {
                const record = read(beforeApi);
                assert.equal(record.variableId, id);
                assert.equal(record.name, 'color-space-probe');
                before = record.value;
            } else if (label === 'p3-cycle1-double-srgb') {
                before = Object.values(initial.variables.find(v => v.id === id).values)[0];
            } else if (label === 'p3-cycle1-double-display-p3') {
                const record = read('evidence/p3-cycle1-before-double-display-p3.tokens.json')['color-space-probe'];
                assert.equal(record.$extensions['com.figma.variableId'], id);
                before = { r: record.$value.components[0], g: record.$value.components[1], b: record.$value.components[2], a: record.$value.alpha };
            } else throw new Error('Missing before state: ' + label);
            assert.deepEqual(before, protocol.sentinel, label + ': exact reset');
            const ui = fs.readFileSync(new URL('evidence/' + label + '.txt', run), 'utf8');
            assert.ok(ui.includes('color-space-probe'));
            assert.ok(fs.statSync(new URL('evidence/' + label + '.png', run)).size > 0);
            const actual = token.$value;
            const input = read(trial.file)['color-space-probe'].$value;
            if (trial.colorSpace === 'srgb') {
                assert.ok(ui.includes('1 variable updated'), label);
                input.components.forEach((c, i) => assert.ok(Math.abs(actual.components[i] - c) < protocol.inputChannelTolerance, label));
                assert.equal(actual.alpha, 1);
            } else {
                assert.ok(ui.includes('Encountered an error importing 1 token'), label);
                assert.deepEqual(actual.components, [before.r, before.g, before.b]);
                assert.equal(actual.alpha, before.a);
                assert.ok(exists('evidence/' + profile + '-cycle' + cycle + '-' + trial.precision + '-srgb.tokens.json'), label + ': positive pair');
            }
            importCount++;
            importResults.push({ label, variableId: id, outcome: trial.colorSpace === 'srgb' ? 'updated' : 'skipped with UI error and exact sentinel preserved' });
        }
    }
}
assert.equal(importCount, read('metadata.json').recordedCounts.importTrials, 'Recorded trial count changed');
console.table(rows);
console.log('Frozen observations: 21/21 paired readings and preregistered predictions match; 12/12 layers of four new colours.');
console.log('Archived paired native-import trials checked: ' + importCount + '/16.');
console.log('These checks validate recorded evidence and calculations; they do not run live Figma or identify its internal code.');
if (process.argv.includes('--write-report')) {
    fs.writeFileSync(new URL('comparison.json', run), JSON.stringify({ comparedAt: new Date().toISOString(), devMode: rows, importTrials: importResults, importCount, plannedImportCount: 16, importMatrixComplete: importCount === 16 }, null, 2) + '\n');
}
if (process.argv.includes('--require-complete')) assert.equal(importCount, 16, 'Live import matrix remains incomplete');
