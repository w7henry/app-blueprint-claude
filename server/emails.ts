// Emails via Resend, rendered from the creator's templates (config copy.emails)
// in her brand colours. Each automated email goes out at most once per
// (kind, dedupeKey) thanks to the message_log unique constraint.

import type { CreatorConfig } from '../creators/schema';
import { fill, type TemplateVars } from '../src/shared/template';
import type { Ctx } from './context';

type EmailKind = keyof CreatorConfig['copy']['emails'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderEmail(
  creator: CreatorConfig,
  kind: EmailKind,
  vars: TemplateVars,
  ctaUrl: string,
  footerExtra = '',
): { subject: string; html: string; text: string } {
  const t = creator.copy.emails[kind];
  const c = creator.brand.colors;
  const subject = fill(t.subject, vars);
  const body = t.body.map((p) => fill(p, vars)).filter(Boolean);
  const op = creator.legal.operator;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;background:${c.bg};color:${c.text};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:17px;line-height:1.5">
<span style="display:none;max-height:0;overflow:hidden">${esc(fill(t.preview, vars))}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td style="font-family:Georgia,serif;font-size:24px;padding-bottom:24px">${esc(creator.brand.logo.text)}</td></tr>
${body.map((p) => `<tr><td style="padding:0 0 14px">${esc(p)}</td></tr>`).join('')}
<tr><td style="padding:12px 0 28px"><a href="${esc(ctaUrl)}" style="display:inline-block;background:${c.accent};color:${c.accentContrast};text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px">${esc(fill(t.cta, vars))}</a></td></tr>
<tr><td style="font-family:Georgia,serif;font-style:italic;font-size:20px;padding-bottom:32px">${esc(creator.voice.signOff)}</td></tr>
<tr><td style="font-size:13px;color:${c.muted};border-top:1px solid ${c.line};padding-top:16px">${esc(op.name)} · ${esc(op.address.join(', '))}${footerExtra}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${body.join('\n\n')}\n\n${fill(t.cta, vars)}: ${ctaUrl}\n\n${creator.voice.signOff}\n\n${op.name}, ${op.address.join(', ')}`;
  return { subject, html, text };
}

export async function sendEmail(
  ctx: Ctx,
  opts: { to: string; kind: EmailKind; vars?: TemplateVars; ctaUrl: string; userId?: string | null; dedupeKey?: string; unsubscribeUrl?: string },
): Promise<boolean> {
  // Claim the send first; a duplicate (kind, key) means it already went out.
  if (opts.dedupeKey) {
    const { error } = await ctx.db
      .from('message_log')
      .insert({ user_id: opts.userId ?? null, email: opts.to, kind: opts.kind, dedupe_key: opts.dedupeKey, channel: 'email' });
    if (error) {
      if (error.code === '23505') return false;
      console.error('[email] log failed', error.message);
    }
  }
  const extra = opts.unsubscribeUrl ? ` · <a href="${esc(opts.unsubscribeUrl)}" style="color:inherit">Unsubscribe</a>` : '';
  const { subject, html, text } = renderEmail(ctx.creator, opts.kind, opts.vars ?? {}, opts.ctaUrl, extra);
  const { error } = await ctx.resend.emails.send({
    from: ctx.env.emailFrom,
    to: opts.to,
    subject,
    html,
    text,
    replyTo: ctx.creator.identity.supportEmail,
    headers: opts.unsubscribeUrl ? { 'List-Unsubscribe': `<${opts.unsubscribeUrl}>` } : undefined,
  });
  if (error) {
    console.error('[email] send failed', opts.kind, error.message);
    if (opts.dedupeKey) await ctx.db.from('message_log').delete().match({ kind: opts.kind, dedupe_key: opts.dedupeKey });
    return false;
  }
  return true;
}
