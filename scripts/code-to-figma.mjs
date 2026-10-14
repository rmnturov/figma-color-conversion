import { codeToFigma } from '../src/colors.mjs';

const [input, ...flags] = process.argv.slice(2);
if (!input || flags.some(flag => flag !== '--clip')) {
    throw new Error('Usage: node scripts/code-to-figma.mjs "oklch(32.6% 0.117 266)" [--clip]');
}
console.log(JSON.stringify(codeToFigma(input, { clip: flags.includes('--clip') }), null, 2));
