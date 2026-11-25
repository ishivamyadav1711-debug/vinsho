/**
 * Generates small WebP thumbnails of the product photos in public/, used by product cards,
 * collection previews, related products and cart suggestions.
 *
 * Runs automatically before every `npm run build` (the "prebuild" script).
 *   public/images/vinsho/products/foo.jpg  ->  public/thumbs/images/vinsho/products/foo.webp
 * and writes src/data/thumbs.generated.json listing every original that has a thumbnail.
 * Both outputs are gitignored and rebuilt each time.
 *
 * Never fails the build: if sharp is unavailable or an image can't be read, that image keeps
 * using the original file (src/lib/thumbs.ts falls back to it).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'thumbs');
const MANIFEST = path.join(ROOT, 'src/data/thumbs.generated.json');
const WIDTH = 600; // ~170-280 CSS px cards on 2-3x screens
const QUALITY = 72;
const SOURCE_DIRS = ['images', 'products']; // under public/
const SKIP = /(^|\/)(thumbs|site)\//; // site imagery (hero, lookbook) isn't shown as cards

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function writeManifest(list) {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(list.sort()));
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (err) {
  console.warn(`[thumbnails] sharp is not available (${err.message}); product images will use the originals.`);
  writeManifest([]);
  process.exit(0);
}

const started = Date.now();
const sources = SOURCE_DIRS.flatMap((d) => (fs.existsSync(path.join(PUBLIC, d)) ? walk(path.join(PUBLIC, d)) : []))
  .filter((f) => !SKIP.test(path.relative(PUBLIC, f).split(path.sep).join('/')));

const done = [];
let made = 0;
let failed = 0;
const queue = [...sources];

async function worker() {
  while (queue.length) {
    const src = queue.shift();
    const rel = path.relative(PUBLIC, src).split(path.sep).join('/');
    const dest = path.join(OUT, rel.replace(/\.(jpe?g|png)$/i, '.webp'));
    try {
      const fresh = fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;
      if (!fresh) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await sharp(src).rotate().resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(dest);
        made++;
      }
      done.push('/' + rel);
    } catch (err) {
      failed++;
      console.warn(`[thumbnails] skipped ${rel}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 4 }, worker));
writeManifest(done);
console.log(`[thumbnails] ${done.length} thumbnails ready (${made} generated, ${failed} skipped) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
