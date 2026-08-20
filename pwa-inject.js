// Pós-build: injeta ícone da logomarca (tela do telefone) + manifest PWA no dist do Expo web.
const fs = require('fs');
const path = require('path');

const dist = 'dist';
const copy = ['icon-512.png', 'icon-192.png', 'icon-180.png'];
for (const f of copy) {
  try { fs.copyFileSync(f, path.join(dist, f)); } catch (e) { console.warn('skip', f, e.message); }
}

const manifest = {
  name: 'VITALITY — Instituto Vitality',
  short_name: 'VITALITY',
  description: 'Saúde metabólica · Programa RenovaCorps — Instituto Vitality.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0D1F3F',
  theme_color: '#0D1F3F',
  lang: 'pt-BR',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

const idx = path.join(dist, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
const head = `
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <meta name="theme-color" content="#0D1F3F" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="VITALITY" />
`;
if (!html.includes('manifest.json')) {
  html = html.replace(/(<\/title>\s*)/i, `$1${head}`);
  fs.writeFileSync(idx, html);
  console.log('PWA manifest + apple-touch-icon injected.');
} else {
  console.log('PWA already present.');
}
