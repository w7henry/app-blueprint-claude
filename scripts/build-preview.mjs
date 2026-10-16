#!/usr/bin/env node
// Builds the app (demo mode) into ONE self-contained HTML file: JS, CSS, fonts
// and app screens inline, route kept in memory. Opens anywhere without a server,
// e.g. in the Claude app's preview panel or by double-click.
//   CREATOR_SLUG=ayria npm run preview:file   →  dist-preview/<slug>-preview.html

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

process.env.PREVIEW_FILE = '1';
process.env.VITE_ROUTER = 'memory';
// Demo mode, whatever is in the local .env.
process.env.VITE_SUPABASE_URL = '';
process.env.VITE_SUPABASE_ANON_KEY = '';

const slug = process.env.CREATOR_SLUG ?? 'ayria';
await build({ logLevel: 'warn' });

const out = path.resolve('dist-preview');
let html = readFileSync(path.join(out, 'index.html'), 'utf8');
const read = (href) => readFileSync(path.join(out, href.replace(/^\//, '')), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = read(src).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
const left = [...html.matchAll(/(?:src|href)="\/assets\/[^"]+"/g)].map((m) => m[0]);
if (left.length) throw new Error(`Not inlined: ${left.join(', ')}`);
const leftovers = readdirSync(path.join(out, 'assets')).filter((f) => !/\.(js|css)$/.test(f));
if (leftovers.length) throw new Error(`Assets that did not inline: ${leftovers.join(', ')}`);

const file = path.join(out, `${slug}-preview.html`);
writeFileSync(file, html);
console.log(`✓ ${path.relative(process.cwd(), file)} (${(html.length / 1024).toFixed(0)} KB)`);
