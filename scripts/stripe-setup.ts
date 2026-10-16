// Creates the creator's Stripe products and prices from the config (idempotent).
// Prices are found by lookup key, so the same config works in test and live mode.
//   STRIPE_SECRET_KEY=sk_test_… CREATOR_SLUG=ayria npm run stripe:setup

import Stripe from 'stripe';
import { loadCreator } from '../creators';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (use a test key first).');
  process.exit(1);
}
const stripe = new Stripe(key);
const { creator } = loadCreator(process.env.CREATOR_SLUG ?? 'ayria');
const currency = creator.offer.currency;

async function ensurePrice(lookupKey: string, name: string, unitAmount: number, recurring?: { interval: 'month' | 'year' }) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    const p = existing.data[0];
    if (p.unit_amount !== unitAmount || p.currency !== currency) {
      console.warn(
        `! ${lookupKey}: Stripe has ${p.unit_amount} ${p.currency}, config says ${unitAmount} ${currency}. Create a new lookup key (e.g. _v2) for a price change.`,
      );
    } else console.log(`✓ ${lookupKey} exists (${p.id})`);
    return;
  }
  const product = await stripe.products.create({ name, metadata: { creator: creator.identity.slug } });
  const price = await stripe.prices.create({
    product: product.id,
    currency,
    unit_amount: unitAmount,
    lookup_key: lookupKey,
    ...(recurring ? { recurring } : {}),
    tax_behavior: 'inclusive',
    metadata: { creator: creator.identity.slug },
  });
  console.log(`+ ${lookupKey} created (${price.id})`);
}

for (const p of creator.offer.plans) {
  await ensurePrice(p.stripeLookupKey, `${creator.identity.appName} ${p.label}`, p.priceCents, { interval: p.interval });
}
if (creator.offer.oneTime?.enabled) {
  await ensurePrice(creator.offer.oneTime.stripeLookupKey, `${creator.identity.appName}: ${creator.offer.oneTime.label}`, creator.offer.oneTime.priceCents);
}
console.log('\nNext: add a webhook endpoint → https://<your-app>/api/stripe/webhook with these events:');
console.log('  checkout.session.completed, checkout.session.async_payment_succeeded, customer.subscription.created,');
console.log('  customer.subscription.updated, customer.subscription.deleted, customer.subscription.paused,');
console.log('  customer.subscription.resumed, customer.subscription.trial_will_end, invoice.paid, invoice.payment_failed, charge.refunded');
