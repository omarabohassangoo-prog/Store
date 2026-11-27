import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'public');
const outputDir = path.join(projectRoot, 'dist');
const checkOnly = process.argv.includes('--check');

function collectLocalReferences(html) {
  const refs = new Set();
  const pattern = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(pattern)) {
    const value = match[2].trim();
    if (!value || value.startsWith('#') || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(value)) continue;
    const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]).replace(/^\/+/, '');
    if (pathname) refs.add(pathname);
  }
  return [...refs];
}

function verifyFiles(root, refs) {
  const missing = refs.filter((ref) => {
    const file = path.resolve(root, ref);
    return !file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile();
  });
  if (missing.length) {
    throw new Error(`Storefront references missing files in ${root}:\n${missing.map((file) => ` - ${file}`).join('\n')}`);
  }
}

const htmlPath = path.join(sourceDir, 'index.html');
if (!fs.existsSync(htmlPath)) throw new Error(`Missing storefront entry: ${htmlPath}`);
const html = fs.readFileSync(htmlPath, 'utf8');
const refs = collectLocalReferences(html);
verifyFiles(sourceDir, refs);

if (checkOnly) {
  console.log(`Storefront asset check passed (${refs.length} referenced local assets).`);
} else {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, outputDir, { recursive: true });
  verifyFiles(outputDir, refs);
  console.log(`Copied storefront to dist and verified ${refs.length} referenced local assets.`);
}
