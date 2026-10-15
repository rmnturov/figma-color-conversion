import test from 'node:test';
import assert from 'node:assert/strict';
import { singleWrapUnitHsl, fallbackCandidates } from '../src/research-models.mjs';

test('HSL candidate uses raw S/L and a single Hue correction, including invalid inputs', () => {
    const cases = [
        [[266, 50, 30], [1480, 1480, 1480]],
        [[266, .5, .3], [.15, .15, .15]],
        [[266 / 360, .5, .3], [.28, .15, .45]],
        [[0, 0, .5], [.5, .5, .5]],
        [[0, 0, 50], [50, 50, 50]]
    ];
    for (const [input, expected] of cases) {
        singleWrapUnitHsl(input).forEach((c, i) => assert.ok(Math.abs(c - expected[i]) < 1e-12));
    }
});

test('four pass counts and rounding alternatives distinguish the archived overlay result', () => {
    const candidates = fallbackCandidates([29 / 255, 45 / 255, 107 / 255]);
    assert.deepEqual(candidates.passes, ['#182E6F', '#102F73', '#003077', '#00317C']);
    assert.equal(candidates.twoWithoutIntermediateRounding, '#102E73');
});

test('red seed rounding depends on whether the input is double or stored float32', () => {
    const candidates = fallbackCandidates([.9, .2, .2]);
    assert.equal(candidates.passes[1], '#FF0005');
    assert.equal(candidates.inputRoundedThenTwo, '#FF0004');
    const stored = fallbackCandidates([.9, .2, .2].map(Math.fround));
    assert.equal(stored.passes[1], '#FF0005');
    assert.equal(stored.inputRoundedThenTwo, stored.passes[1]);
});
