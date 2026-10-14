import test from 'node:test';
import assert from 'node:assert/strict';
import Color from 'colorjs.io';
import { codeToFigma, figmaHexToCode, figmaChannelsToCode, observedVariableFallback } from '../src/colors.mjs';

test('P3 HEX for Figma differs from CSS sRGB HEX', () => {
    const result = codeToFigma('oklch(32.6% 0.117 266)');
    assert.equal(result.hexP3, '#1D2D6B');
    const decoded = figmaHexToCode(result.hexP3, { profile: 'p3' });
    assert.equal(decoded.srgbClippedHex, '#182E6F');
    assert.ok(Math.abs(decoded.oklchCoordinates[0] - 0.326) < 0.001);
    assert.equal(figmaHexToCode('#1D2D6B', { profile: 'srgb' }).srgbClippedHex, '#1D2D6B');
});

test('a missing profile is rejected rather than guessed', () => {
    assert.throws(() => figmaHexToCode('#1D2D6B'), TypeError);
});

test('rounding uses P3 channels independently', () => {
    const result = codeToFigma('oklch(84% 0.08 17)');
    assert.equal(result.hexP3, '#F0B9B9');
    assert.deepEqual(result.storedP3IfHex, [240 / 255, 185 / 255, 185 / 255]);
});

test('precise RGBA transfer preserves the code color before HEX quantization', () => {
    const original = new Color('oklch(32.6% 0.117 266)');
    const transfer = codeToFigma(original);
    const decoded = figmaChannelsToCode(
        { r: transfer.p3[0], g: transfer.p3[1], b: transfer.p3[2], a: transfer.opacity },
        { profile: 'p3' }
    );
    assert.ok(Math.abs(decoded.oklchCoordinates[0] - 0.326) < 1e-12);
    assert.ok(Math.abs(decoded.oklchCoordinates[1] - 0.117) < 1e-12);
});

test('out-of-P3 input requires an explicit clipping policy', () => {
    assert.throws(() => codeToFigma('oklch(70% 0.4 145)'), RangeError);
    const result = codeToFigma('oklch(70% 0.4 145)', { clip: true });
    assert.equal(result.hexP3, '#00CE00');
    assert.equal(result.clipped, true);
    const mapped = new Color('oklch(70% 0.4 145)').toGamut({ space: 'p3', method: 'css' });
    assert.ok(Math.abs(mapped.to('p3').coords[1] - result.p3[1]) > 0.01);
});

test('alpha remains separate from RGB HEX', () => {
    const result = codeToFigma('oklch(32.6% 0.117 266 / 0.25)');
    assert.equal(result.hexP3, '#1D2D6B');
    assert.equal(result.opacity, 0.25);
    assert.equal(figmaHexToCode('#1D2D6B40', { profile: 'p3' }).opacity, 64 / 255);
});

test('the empirical model requires intermediate byte rounding', () => {
    const model = observedVariableFallback([29 / 255, 45 / 255, 107 / 255]);
    assert.equal(model.singleClippedHex, '#182E6F');
    assert.equal(model.doubleClippedHex, '#102F73');
    assert.deepEqual(model.reinterpretedP3, [24 / 255, 46 / 255, 111 / 255]);
});
