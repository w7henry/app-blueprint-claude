// Vite plugin: loads + validates the creator config at build time and turns it
// into static output. Nothing creator-specific is hardcoded in components.
//
//  - virtual:creator    → validated config as JSON (+ self-hosted font imports)
//  - virtual:exercises  → shared exercise library with the creator's overrides
//  - index.html         → title, meta, OG tags, theme tokens, hero preload
//  - manifest.webmanifest, icon.svg, sw.js (offline support for the app)
//
// A broken config stops `vite build` / `vite dev` with a readable list of problems.

import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { DEFAULT_CREATOR, loadCreator } from '../creators';
import type { CreatorConfig, CreatorImageSource } from '../creators/schema';
import { themeCss } from '../src/theme';

const V_CREATOR = 'virtual:creator';
const V_EXERCISES = 'virtual:exercises';
const V_ASSETS = 'virtual:assets';
const SCREENS = ['plan', 'player', 'progress', 'today'] as const;

const isRemote = (s: string) => /^https?:\/\//.test(s);

function resolveImage(img: CreatorImageSource, publicDir: string): CreatorImageSource {
  const candidates = [img.src, ...img.fallbacks].filter((s) => s && (isRemote(s) || fs.existsSync(path.join(publicDir, s))));
  return { ...img, src: candidates[0] ?? '', fallbacks: candidates.slice(1) };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function iconSvg(c: CreatorConfig): string {
  const letter = escapeHtml(c.identity.appName.trim()[0]?.toUpperCase() ?? 'A');
  const { accent, accentContrast } = c.brand.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${accent}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="300" fill="${accentContrast}">${letter}</text></svg>`;
}

function manifest(c: CreatorConfig): string {
  return JSON.stringify(
    {
      name: c.identity.appName,
      short_name: c.identity.appName,
      description: c.copy.meta.description,
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      background_color: c.brand.colors.bg,
      theme_color: c.brand.colors.bg,
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    null,
    2,
  );
}

function serviceWorker(precache: string[], version: string): string {
  return `// Generated at build time. Offline support for the workout app.
const CACHE = 'app-${version}';
const PRECACHE = ${JSON.stringify(['/index.html', ...precache])};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only same-origin static files. API, Supabase and Stripe always go to the network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/creators/'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }),
    ),
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Reminder', {
    body: data.body || '',
    icon: '/icon.svg',
    data: { url: data.url || '/app?ref=push' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow((e.notification.data && e.notification.data.url) || '/app'));
});
`;
}

export function creatorPlugin(opts: { singleFile?: boolean } = {}): Plugin {
  const slug = process.env.CREATOR_SLUG || DEFAULT_CREATOR;
  // Single-file preview (scripts/build-preview.mjs): images inline, no manifest / service worker.
  const singleFile = !!opts.singleFile;
  let creator: CreatorConfig;
  let exercises: unknown;
  let publicDir = path.resolve('public');

  const load = () => {
    // Throws with a list of every problem → dev server / build stops here.
    const bundle = loadCreator(slug);
    const c = structuredClone(bundle.creator);
    for (const key of Object.keys(c.brand.images) as (keyof CreatorConfig['brand']['images'])[]) {
      c.brand.images[key] = resolveImage(c.brand.images[key], publicDir);
    }
    creator = c;
    exercises = bundle.exercises;
  };

  return {
    name: 'creator-config',
    enforce: 'pre',

    configResolved(config) {
      publicDir = config.publicDir || publicDir;
      load();
      config.logger.info(`\n  creator: ${slug} (${creator.identity.appName})\n`);
    },

    resolveId(id) {
      if (id === V_CREATOR || id === V_EXERCISES || id === V_ASSETS) return '\0' + id;
      return null;
    },

    load(id) {
      if (id === '\0' + V_CREATOR) {
        // Email copy is server-only; keep it out of the browser bundle.
        const client = { ...creator, copy: { ...creator.copy, emails: undefined } };
        const fonts = [...creator.brand.fonts.display.imports, ...creator.brand.fonts.ui.imports].map((f) => `import ${JSON.stringify(f)};`).join('\n');
        return `${fonts}\nexport default ${JSON.stringify(client)};`;
      }
      if (id === '\0' + V_EXERCISES) return `export default ${JSON.stringify(exercises)};`;
      if (id === '\0' + V_ASSETS) {
        // Real app screenshots for the landing page (npm run screens), if generated.
        const screens = Object.fromEntries(
          SCREENS.map((s) => {
            const rel = `/creators/${slug}/screens/${s}.jpg`;
            const file = path.join(publicDir, rel);
            if (!fs.existsSync(file)) return [s, null];
            return [s, singleFile ? `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}` : rel];
          }),
        );
        return `export default ${JSON.stringify({ screens })};`;
      }
      return null;
    },

    transformIndexHtml() {
      const c = creator;
      const hero = c.brand.images.hero.src;
      const remoteOrigins = [
        ...new Set(
          Object.values(c.brand.images)
            .flatMap((i) => [i.src, ...i.fallbacks])
            .filter(isRemote)
            .map((u) => new URL(u).origin),
        ),
      ];
      const tags = [
        { tag: 'title', children: c.copy.meta.title, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'description', content: c.copy.meta.description }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'theme-color', content: c.brand.colors.bg }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:title', content: c.copy.meta.title }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:description', content: c.copy.meta.description }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' as const },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: c.identity.appName }, injectTo: 'head' as const },
        ...(singleFile
          ? [
              {
                tag: 'link',
                attrs: { rel: 'icon', href: `data:image/svg+xml,${encodeURIComponent(iconSvg(c))}`, type: 'image/svg+xml' },
                injectTo: 'head' as const,
              },
            ]
          : [
              { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' as const },
              { tag: 'link', attrs: { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' }, injectTo: 'head' as const },
            ]),
        { tag: 'style', attrs: { id: 'theme' }, children: themeCss(c.brand), injectTo: 'head-prepend' as const },
        ...remoteOrigins.map((href) => ({ tag: 'link', attrs: { rel: 'preconnect', href }, injectTo: 'head' as const })),
        ...(hero ? [{ tag: 'link', attrs: { rel: 'preload', as: 'image', href: hero, fetchpriority: 'high' }, injectTo: 'head' as const }] : []),
        ...(hero && !isRemote(hero) ? [{ tag: 'meta', attrs: { property: 'og:image', content: hero }, injectTo: 'head' as const }] : []),
      ];
      return tags;
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/manifest.webmanifest') {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(manifest(creator));
          return;
        }
        if (req.url === '/icon.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
          res.end(iconSvg(creator));
          return;
        }
        next();
      });
    },

    generateBundle(_, bundle) {
      if (singleFile) return;
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest(creator) });
      this.emitFile({ type: 'asset', fileName: 'icon.svg', source: iconSvg(creator) });
      const precache = Object.keys(bundle)
        .filter((f) => /\.(js|css)$/.test(f))
        .map((f) => '/' + f);
      const version = Date.now().toString(36);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker(precache, version) });
    },
  };
}
