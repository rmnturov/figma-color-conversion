import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../research/2026-10-15/replication-01/', import.meta.url));
const files = [];
function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const filename = path.join(dir, item.name);
        if (item.isDirectory()) walk(filename);
        else if (item.isFile() && filename !== path.join(root, 'manifest.json')) {
            const bytes = fs.readFileSync(filename);
            files.push({ path: path.relative(root, filename).replaceAll(path.sep, '/'), bytes: bytes.length,
                sha256: createHash('sha256').update(bytes).digest('hex') });
        }
    }
}
walk(root);
files.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2) + '\n');
console.log('Replication manifest written: ' + files.length + ' files.');
