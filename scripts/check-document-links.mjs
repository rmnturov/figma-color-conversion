import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.git'].includes(item.name)) continue;
        const filename = path.join(dir, item.name);
        if (item.isDirectory()) walk(filename);
        else if (filename.endsWith('.md')) {
            const text = fs.readFileSync(filename, 'utf8');
            for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
                const target = match[1].split('#')[0];
                if (!target || /^(https?:|mailto:)/.test(target)) continue;
                if (!fs.existsSync(path.resolve(path.dirname(filename), decodeURIComponent(target)))) {
                    problems.push(path.relative(root, filename) + ': ' + target);
                }
            }
        }
    }
}
walk(root);
if (problems.length) throw new Error(problems.join('\n'));
console.log('Local document and image links are valid.');
