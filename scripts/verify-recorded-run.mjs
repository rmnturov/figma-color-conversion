import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Color from 'colorjs.io';
import { fallbackCandidates } from '../src/research-models.mjs';
import { channelsToHex, codeToFigma, observedVariableFallback, parseHexChannels } from '../src/colors.mjs';

const run = new URL('../research/2026-10-14/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, run), 'utf8'));
const manifest = read('manifest.json');
for (const file of manifest.files) {
    const bytes = fs.readFileSync(new URL(file.path, run));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const cases = read('cases.json');
const observations = read('evidence/devmode-observations.json');
const inverse = read('evidence/inverse-values.json');
const state = read('evidence/figma-state.json');
assert.equal(observations.length, 19);
assert.equal(state.variables.length, 28);
assert.equal(state.nodes.length, 32);
const expand = hex => hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
function uiHex(id, name) {
    const sample = observations.find(o => o.id === id && o.name === name);
    assert.ok(sample?.snapshot, 'Missing browser state: ' + name);
    const match = sample.css.join('\n').match(/#[0-9a-f]{3,8}\b/i);
    assert.ok(match, 'Missing CSS fallback: ' + name);
    return expand(match[0].toUpperCase());
}
const rows = [];
for (const sample of cases.forward) {
    const predicted = observedVariableFallback(sample.p3);
    const literal = uiHex(sample.ids.literal, sample.name + '-literal');
    const variable = uiHex(sample.ids.variable, sample.name + '-variable');
    const alias = uiHex(sample.ids.alias2, sample.name + '-alias2');
    assert.equal(literal, predicted.singleClippedHex);
    assert.equal(variable, predicted.doubleClippedHex);
    assert.equal(alias, variable);
    const stored = state.nodes.find(n => n.id === sample.ids.literal).fill.color;
    const candidates = fallbackCandidates([stored.r, stored.g, stored.b]);
    assert.equal(candidates.passes[0], literal);
    assert.equal(candidates.passes[1], variable);
    rows.push({ name: sample.name, literal, variable, alias, ...Object.fromEntries(candidates.passes.map((hex, i) => ['pass' + (i + 1), hex])), noIntermediateRounding: candidates.twoWithoutIntermediateRounding, inputRounded: candidates.inputRoundedThenTwo });
}
const values = Object.fromEntries(inverse.variables.map(v => [v.name, v.values[inverse.modeId]]));
for (const sample of cases.inverse.filter(c => c.hexP3)) {
    const calculated = codeToFigma(sample.oklch);
    assert.equal(calculated.hexP3, sample.hexP3);
    const parsed = parseHexChannels(sample.hexP3);
    const recordedHex = values[sample.name + '-p3-hex'];
    const recordedCSS = values[sample.name + '-css-oklch'];
    for (const [i, channel] of ['r', 'g', 'b'].entries()) {
        assert.ok(Math.abs(parsed[channel] - recordedHex[channel]) < 2e-7);
        assert.ok(Math.abs(calculated.p3[i] - recordedCSS[channel]) < 2e-7);
    }
    const wrong = values[sample.name + '-srgb-hex'];
    assert.ok(new Color(sample.oklch).deltaE(new Color('p3', [wrong.r, wrong.g, wrong.b]), 'OK') > 0.005);
    for (const suffix of ['p3-hex', 'css-oklch']) {
        const current = state.variables.find(v => v.name === sample.name + '-' + suffix);
        assert.deepEqual(current.values[inverse.modeId], values[sample.name + '-' + suffix]);
    }
}
const outside = cases.inverse.find(c => c.name === 'outside');
assert.throws(() => codeToFigma(outside.oklch), RangeError);
assert.equal(codeToFigma(outside.oklch, { clip: true }).hexP3, outside.hexP3Clipped);
const storedOutside = values['outside-css-oklch'];
assert.equal(storedOutside.r, 0);
assert.equal(storedOutside.b, 0);
assert.ok(Math.abs(storedOutside.g - codeToFigma(outside.oklch, { clip: true }).p3[1]) < 2e-7);
assert.equal(channelsToHex([storedOutside.r, storedOutside.g, storedOutside.b]), outside.hexP3Clipped);
const persistence = read('evidence/native-input-persistence.json');
assert.ok(persistence.beforeReload.join('\n').includes('oklch(84% 0.08 17deg)'));
assert.ok(persistence.afterReload.join('\n').includes('#FAB6B8'));
assert.ok(persistence.afterReload.join('\n').includes('color(display-p3 0.9417 0.7243 0.7259)'));
console.table(rows);
assert.equal(rows.filter(row => row.pass1 !== row.pass2).length, 4);
assert.equal(rows.filter(row => row.pass3 === row.variable).length, 2);
assert.equal(rows.filter(row => row.pass4 === row.variable).length, 2);
assert.equal(rows.filter(row => row.inputRounded === row.variable).length, 6);
console.log('Archive/model agreement: 6/6 literal and variable HEX values; 4/6 distinguish one from two passes.');
console.log('Three and four passes each match only 2/6 controls. Input-byte rounding also matches all 6 stored float32 samples; this archive does not distinguish that alternative.');
console.log('This checks archived observations and calculations, not live Figma or its internal implementation.');
