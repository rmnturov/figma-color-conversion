import Color from 'colorjs.io';
import { clamp, quantize, channelsToHex } from './colors.mjs';

// Candidate for the archived importer behaviour, including invalid unit inputs.
// Hue is corrected once in each channel; it is not reduced modulo one.
export function singleWrapUnitHsl([h, s, l]) {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    function channel(t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }
    return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

export function conversionPasses(p3, count, { roundBetween = true, roundInput = false } = {}) {
    let channels = roundInput ? quantize(p3).map(v => v / 255) : [...p3];
    for (let i = 0; i < count; i++) {
        channels = new Color('p3', channels).to('srgb').coords.map(clamp);
        if (roundBetween) channels = quantize(channels).map(v => v / 255);
    }
    return { channels, hex: channelsToHex(channels) };
}

export function fallbackCandidates(p3) {
    return {
        passes: [1, 2, 3, 4].map(count => conversionPasses(p3, count).hex),
        twoWithoutIntermediateRounding: conversionPasses(p3, 2, { roundBetween: false }).hex,
        inputRoundedThenTwo: conversionPasses(p3, 2, { roundInput: true }).hex
    };
}
