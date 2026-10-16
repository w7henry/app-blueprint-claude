#!/usr/bin/env node
// Downloads the remote fallback images of a creator config into public/creators/<slug>/
// so they are self-hosted (faster, no third party sees your visitors).
//   node scripts/fetch-creator-assets.mjs ayria
// Use only images you have the rights to. For launch, replace them with the creator's own photos.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const slug = process.argv[2] ?? 'ayria';
const { creatorInputs } = await import('../creators/index.ts').catch(async () => {
  console.error('Run with tsx: npx tsx scripts/fetch-creator-assets.mjs ' + slug);
  process.exit(1);
});
const c = creatorInputs[slug];
if (!c) {
  console.error(`Unknown creator "${slug}"`);
  process.exit(1);
}
const dir = path.resolve('public/creators', slug);
await mkdir(dir, { recursive: true });
for (const [name, img] of Object.entries(c.brand.images)) {
  const target = path.join(dir, path.basename(img.src));
  for (const url of img.fallbacks ?? []) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) throw new Error(`${res.status} ${type}`);
      await writeFile(target, Buffer.from(await res.arrayBuffer()));
      console.log(`✓ ${name} → ${path.relative(process.cwd(), target)} (from ${new URL(url).host})`);
      break;
    } catch (e) {
      console.warn(`  ${name}: ${url} failed (${e.message})`);
    }
  }
}
console.log('\nRestart `npm run dev` — local files are used before remote fallbacks.');
