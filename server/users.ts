// Passwordless accounts: created after payment, login via one-time token links.

import type { Ctx } from './context';

export async function ensureUser(ctx: Ctx, email: string): Promise<string> {
  const created = await ctx.db.auth.admin.createUser({ email, email_confirm: true });
  if (created.data.user) return created.data.user.id;
  // Already registered → generateLink returns the existing user.
  const link = await ctx.db.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.data.user) return link.data.user.id;
  throw new Error(`Could not create or find user: ${created.error?.message ?? link.error?.message}`);
}

/** One-time token for /login/callback (verified client-side with verifyOtp). */
export async function loginToken(ctx: Ctx, email: string): Promise<string> {
  const { data, error } = await ctx.db.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink failed: ${error?.message}`);
  return data.properties.hashed_token;
}

export async function loginUrl(ctx: Ctx, email: string, ref = 'email'): Promise<string> {
  const token = await loginToken(ctx, email);
  return `${ctx.env.appUrl}/login/callback?token_hash=${encodeURIComponent(token)}&ref=${ref}`;
}

export async function userFromToken(ctx: Ctx, authHeader: string | undefined): Promise<{ id: string; email: string | null } | null> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const { data, error } = await ctx.db.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function emailOf(ctx: Ctx, userId: string): Promise<string | null> {
  const { data } = await ctx.db.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}
