// Backend entry (Railway): npm run start:server
import { createApp } from './app';
import { getCtx } from './context';

try {
  const ctx = getCtx();
  createApp(ctx).listen(ctx.env.port, () => {
    console.log(`API for ${ctx.creator.identity.appName} (${ctx.creator.identity.slug}) on :${ctx.env.port}`);
  });
} catch (e) {
  console.error(`\nServer could not start:\n${(e as Error).message}\n`);
  process.exit(1);
}
