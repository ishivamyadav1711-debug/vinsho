/**
 * Small WebP thumbnails for product photos, generated at build time by
 * scripts/generate-thumbnails.mjs. Falls back to the original image when no thumbnail
 * exists (e.g. images added later via the CRM, or in `astro dev`, where prebuild doesn't run).
 */
const manifests = import.meta.glob<string[]>('../data/thumbs.generated.json', { eager: true, import: 'default' });
const available = new Set<string>(Object.values(manifests)[0] ?? []);

export function thumb(src: string | null | undefined): string {
  if (!src) return src ?? '';
  return available.has(src) ? '/thumbs' + src.replace(/\.(jpe?g|png)$/i, '.webp') : src;
}
