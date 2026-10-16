// 9:16 progress card in the creator's branding, shared via the native share
// sheet (retention.md §5). Drawn on a canvas with the theme tokens.

import creator from '../creator';
import { track } from '../lib/analytics';
import { downloadFile } from './ics';

export interface CardContent {
  eyebrow: string;
  headline: string;
  big: string;
  sub: string;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawShareCard(content: CardContent): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const c = creator.brand.colors;
  const display = creator.brand.fonts.display;
  const ui = creator.brand.fonts.ui;
  const tx = (s: string) => (display.uppercase ? s.toUpperCase() : s);
  try {
    await Promise.all([document.fonts.load(`${display.weight} 120px "${display.family}"`), document.fonts.load(`600 40px "${ui.family}"`)]);
  } catch {
    /* fall back to system fonts */
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, H - 560, W, 560);

  const displayFont = (px: number) => `${display.weight} ${px}px "${display.family}", ${display.fallback}`;
  const uiFont = (px: number, w = 600) => `${w} ${px}px "${ui.family}", ${ui.fallback}`;

  ctx.fillStyle = c.text;
  ctx.font = displayFont(64);
  ctx.fillText(tx(creator.brand.logo.text), 88, 170);

  ctx.fillStyle = c.muted;
  ctx.font = uiFont(40);
  ctx.fillText(content.eyebrow.toUpperCase(), 88, 420);

  ctx.fillStyle = c.text;
  ctx.font = displayFont(112);
  let y = 560;
  for (const l of wrap(ctx, tx(content.headline), W - 176)) {
    ctx.fillText(l, 88, y);
    y += 124;
  }

  ctx.font = displayFont(200);
  ctx.fillStyle = c.accent;
  for (const l of wrap(ctx, tx(content.big), W - 176)) {
    y += 40;
    ctx.fillText(l, 88, y + 160);
    y += 200;
  }

  ctx.fillStyle = c.accentContrast;
  ctx.font = uiFont(46, 500);
  let sy = H - 400;
  for (const l of wrap(ctx, content.sub, W - 176)) {
    ctx.fillText(l, 88, sy);
    sy += 62;
  }
  ctx.font = uiFont(52, 700);
  ctx.fillText(creator.identity.handle, 88, H - 120);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

export async function shareProgress(content: CardContent, kind: string): Promise<void> {
  const blob = await drawShareCard(content);
  track('share_card_created', { kind });
  const file = new File([blob], `${creator.identity.slug}-progress.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: `${content.headline} ${content.big} ${creator.identity.handle}` });
      track('share_card_shared', { kind, method: 'native' });
    } catch {
      /* user closed the share sheet */
    }
    return;
  }
  downloadFile(blob, file.name, 'image/png');
  track('share_card_shared', { kind, method: 'download' });
}
