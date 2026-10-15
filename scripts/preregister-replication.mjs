import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Color from 'colorjs.io';
import { clamp } from '../src/colors.mjs';
import { fallbackCandidates } from '../src/research-models.mjs';

const run = new URL('../research/2026-10-15/replication-01/', import.meta.url);
if (fs.existsSync(run)) throw new Error('Preregistration already exists; do not overwrite it');
fs.mkdirSync(new URL('imports/', run), { recursive: true });
fs.mkdirSync(new URL('evidence/', run));
const write = (name, data) => fs.writeFileSync(new URL(name, run), JSON.stringify(data, null, 2) + '\n');
const seeds = [
    ['A', 'oklch(60% 0.35 328)'],
    ['B', 'oklch(90% 0.2 100)'],
    ['C', 'oklch(85% 0.15 195)'],
    ['D', 'oklch(15% 0.05 264)'],
    ['E', 'color(display-p3 0.9 0.2 0.2)'],
    ['F', 'color(display-p3 0 1 0)'],
    ['G', 'color(display-p3 0.5 0.5 0.5)']
];
const specimens = seeds.map(([key, css], index) => {
    const p3 = new Color(css).to('p3').coords;
    const storedP3 = p3.map(clamp).map(Math.fround);
    return {
        key, css, newColour: index < 4, unboundedP3: p3,
        inputP3: storedP3, inputMethod: 'Plugin API SOLID and COLOR variable; identical clamped float32 RGB; alpha 1',
        preClipped: p3.some(c => c < 0 || c > 1),
        predictions: fallbackCandidates(storedP3),
        unclippedCounterfactual: fallbackCandidates(p3)
    };
});
write('predictions.json', {
    registeredAt: new Date().toISOString(), library: 'colorjs.io@0.5.2',
    status: 'predictions only; no Figma observations collected',
    expectedLiteral: 'passes[0]', expectedVariable: 'passes[1]', expectedTwoAliases: 'passes[1]',
    specimens
});
const coordinates = {
    double: [29 / 255, 45 / 255, 107 / 255],
    float32: [0.11372549086809158, 0.1764705926179886, 0.41960784792900085]
};
const imports = [];
for (const [precision, components] of Object.entries(coordinates)) {
    for (const colorSpace of ['srgb', 'display-p3']) {
        const name = precision + '-' + colorSpace + '.tokens.json';
        write('imports/' + name, { 'color-space-probe': { $type: 'color', $value: { colorSpace, components, alpha: 1 } } });
        imports.push({ precision, colorSpace, file: 'imports/' + name });
    }
}
write('protocol.json', {
    team: "quaaacks's team", profiles: ['Display-P3', 'sRGB'],
    devModeProfile: 'Display-P3', devModeRows: specimens.length, variants: ['literal', 'variable', 'alias2'],
    inputChannelTolerance: 2e-7,
    importVariableName: 'color-space-probe', sentinel: { r: .03125, g: .0625, b: .125, a: .75 },
    importCyclesPerProfile: 2, imports,
    importOrderPerCycle: imports.map(t => t.file),
    importPredictions: { srgb: 'updates same seeded variable to components, alpha 1', 'display-p3': 'error notice and sentinel unchanged' },
    resetBeforeEveryImport: true,
    acceptance: {
        devMode: 'All 21 layers must have readable CSS, screenshot and two recorded readings. Test predictions only after readings are saved. Retain any mismatch.',
        input: 'Actual stored channels must match preregistered input; otherwise label input failure rather than silently changing predictions.',
        imports: 'Same variable name and ID in all trials; successful srgb paired control; UI error plus unchanged sentinel for skip; two cycles in each profile.',
        environment: 'Record browser, OS, Node, Color.js and available Figma build before collecting; explicitly mark unavailable Figma web build.',
        independence: 'Second reading must be recorded before model comparison. Same-agent rereading is not a blinded independent researcher.'
    }
});
write('preregistration-hashes.json', {
    files: ['predictions.json', 'protocol.json', ...imports.map(t => t.file)].map(path => ({
        path, sha256: createHash('sha256').update(fs.readFileSync(new URL(path, run))).digest('hex')
    }))
});
console.log('Predictions and paired import fixtures written. Commit before opening Figma; never regenerate this run in place.');
