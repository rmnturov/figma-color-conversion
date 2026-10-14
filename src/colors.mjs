import Color from 'colorjs.io';

export const clamp = value => Math.max(0, Math.min(1, value));
export const quantize = channels => channels.map(v => Math.round(clamp(v) * 255));
export const channelsToHex = channels =>
    '#' + quantize(channels).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

export function parseHexChannels(hex) {
    if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
        throw new TypeError('Expected #RRGGBB or #RRGGBBAA');
    }
    const bytes = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255);
    return { r: bytes[0], g: bytes[1], b: bytes[2], a: bytes[3] ?? 1 };
}

export function codeToFigma(input, { clip = false } = {}) {
    const p3 = new Color(input).to('p3');
    const inP3 = p3.coords.every(v => v >= 0 && v <= 1);
    if (!inP3 && !clip) {
        throw new RangeError('Color is outside Display-P3. Use --clip to reproduce the observed Figma input behavior.');
    }
    const channels = p3.coords.map(clamp);
    return {
        hexP3: channelsToHex(channels),
        opacity: Number(p3.alpha),
        p3: p3.coords,
        storedP3IfHex: quantize(channels).map(v => v / 255),
        inP3,
        clipped: !inP3
    };
}

export function figmaChannelsToCode({ r, g, b, a = 1 }, { profile } = {}) {
    if (!['p3', 'srgb'].includes(profile)) {
        throw new TypeError('Specify the Figma document profile: p3 or srgb');
    }
    const color = new Color(profile, [r, g, b], a);
    const srgb = color.to('srgb');
    return {
        profile,
        opacity: a,
        css: color.toString({ precision: 8 }),
        oklch: color.to('oklch').toString({ precision: 8 }),
        oklchCoordinates: color.to('oklch').coords,
        srgb: srgb.coords,
        inSRGB: srgb.coords.every(v => v >= 0 && v <= 1),
        srgbClippedHex: channelsToHex(srgb.coords)
    };
}

export function figmaHexToCode(hex, options) {
    return figmaChannelsToCode(parseHexChannels(hex), options);
}

export function observedVariableFallback(p3Channels) {
    const first = new Color('p3', p3Channels).to('srgb');
    const rounded = quantize(first.coords).map(v => v / 255);
    const second = new Color('p3', rounded).to('srgb');
    return {
        singleClippedHex: channelsToHex(first.coords),
        doubleClippedHex: channelsToHex(second.coords),
        firstSRGB: first.coords,
        reinterpretedP3: rounded,
        secondSRGB: second.coords
    };
}
