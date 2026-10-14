import { figmaHexToCode } from '../src/colors.mjs';

const [hex, flag, profile, ...extra] = process.argv.slice(2);
if (!hex || flag !== '--profile' || !profile || extra.length) {
    throw new Error('Usage: node scripts/figma-to-code.mjs "#1D2D6B" --profile p3');
}
console.log(JSON.stringify(figmaHexToCode(hex, { profile }), null, 2));
