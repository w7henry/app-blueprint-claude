// Legal pages generated from creator.legal. DRAFT templates — they must be
// reviewed by a lawyer before launch (blueprint/legal.md). While
// `legal.draft` is true a visible banner says so.

import type { ReactNode } from 'react';
import { BackButton } from '../components/ui';
import creator from '../creator';
import { formatLongDate } from '../shared/format';

const { legal, identity } = creator;
const op = legal.operator;
const usesRemoteImages = Object.values(creator.brand.images).some((i) => [i.src, ...i.fallbacks].some((s) => /^https?:/.test(s)));

function Imprint() {
  return (
    <>
      <h2>Operator</h2>
      <p>
        {op.name}
        {op.address.map((l) => (
          <span key={l}>
            <br />
            {l}
          </span>
        ))}
      </p>
      {op.representative ? <p>Represented by: {op.representative}</p> : null}
      <h2>Contact</h2>
      <p>
        Email: <a href={`mailto:${op.email}`}>{op.email}</a>
        {op.phone ? (
          <>
            <br />
            Phone: {op.phone}
          </>
        ) : null}
      </p>
      {op.vatId ? (
        <>
          <h2>VAT ID</h2>
          <p>{op.vatId}</p>
        </>
      ) : null}
      <h2>Content</h2>
      <p>
        {identity.appName} is offered by {op.name} in cooperation with {identity.name} ({identity.handle}).
      </p>
      <h2>Consumer dispute resolution</h2>
      <p>We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <h2>Who is responsible</h2>
      <p>
        {op.name}, {op.address.join(', ')}. Contact: <a href={`mailto:${op.email}`}>{op.email}</a>.
      </p>
      <h2>What we process and why</h2>
      <ul>
        <li>
          <strong>Website and quiz.</strong> Your quiz answers are stored in your browser for this visit only (session storage) so a reload doesn’t lose them.
          No cookies, no advertising trackers.
        </li>
        <li>
          <strong>Usage statistics.</strong> We count funnel and in-app steps (e.g. “quiz completed”) in our own database, with a random ID that only lives for
          your current visit. We never store your email, photos or body measurements in these statistics.
        </li>
        <li>
          <strong>Email.</strong> We use your email to send you your plan, your login link and messages about your membership. Tips and offers only if you
          ticked the separate box and confirmed it (double opt-in). You can unsubscribe at any time.
        </li>
        <li>
          <strong>Payments.</strong> Payments are processed by Stripe. We don’t see or store your card details.
        </li>
        <li>
          <strong>Your training data.</strong> Workouts, sets and settings are stored on your device and in our database (Supabase) so they sync between
          devices. Only you can see them — not {identity.firstName}.
        </li>
        <li>
          <strong>Service providers.</strong> Supabase (database, login), Stripe (payments), Resend (emails) and our hosting provider process data on our behalf
          under data processing agreements.
        </li>
        {usesRemoteImages ? (
          <li>
            <strong>Images.</strong> Some profile images are currently loaded from unavatar.io, which receives your IP address when the image loads.
          </li>
        ) : null}
      </ul>
      <h2>How long we keep data</h2>
      <p>As long as you have an account, plus statutory retention periods for invoices. Delete your account at any time in Settings → Account.</p>
      <h2>Your rights</h2>
      <p>
        You can ask for access, correction, deletion, restriction, data portability and object to processing. You can also complain to a data protection
        authority. Email us at <a href={`mailto:${op.email}`}>{op.email}</a>.
      </p>
    </>
  );
}

function Terms() {
  const trial = creator.offer.plans.find((p) => p.trialDays > 0);
  return (
    <>
      <h2>Your contract partner</h2>
      <p>
        Your contract is with {legal.contractPartner === 'operator' ? op.name : identity.name}. {identity.appName} is a digital fitness program with an app.
      </p>
      <h2>Membership and billing</h2>
      <p>
        Memberships renew automatically for the same period until cancelled. The price and the next billing date are shown before you pay.
        {trial ? ` A free trial turns into a paid membership when it ends unless you cancel before; we remind you by email 3 days before.` : ''}
      </p>
      <h2>Cancellation</h2>
      <p>
        You can cancel at any time in the app (Settings → Membership → Cancel membership here) or on our <a href="/cancel">cancellation page</a>. Your access
        continues until the end of the period you have paid for.
      </p>
      <h2>Health</h2>
      <p>
        The program is general fitness guidance, not medical advice. Talk to a doctor before you start if you are pregnant, injured or have a medical condition.
        Stop if something hurts. Results differ from person to person and are not guaranteed.
      </p>
      <h2>Age</h2>
      <p>Purchases are for adults. If you are under 18, a parent or guardian must agree to the purchase.</p>
      <h2>Content</h2>
      <p>All workouts, videos and texts are for your personal use only.</p>
    </>
  );
}

function Withdrawal() {
  return (
    <>
      <h2>Right of withdrawal</h2>
      <p>
        If you are a consumer in the EU, you have the right to withdraw from this contract within 14 days without giving any reason. The withdrawal period is 14
        days from the day the contract is concluded. To exercise it, send us a clear statement (e.g. an email to <a href={`mailto:${op.email}`}>{op.email}</a>).
      </p>
      <h2>Effects of withdrawal</h2>
      <p>
        If you withdraw, we refund all payments we received from you without undue delay and no later than 14 days after we receive your withdrawal, using the
        same payment method.
      </p>
      <h2>Early start of your membership</h2>
      <p>
        At checkout you can ask for your membership to start right away. For digital content, your right of withdrawal expires once access has started with your
        express consent and acknowledgement. For services started on your request during the withdrawal period, you pay a proportionate amount for the time
        used.
      </p>
      <h2>Model withdrawal form</h2>
      <p>
        To {op.name}, {op.address.join(', ')}, {op.email}: I hereby withdraw from my contract for the {identity.appName} membership. Ordered on: … Name: … Email
        used: … Date: …
      </p>
    </>
  );
}

const DOCS: Record<string, { title: string; body: () => ReactNode }> = {
  imprint: { title: 'Imprint', body: Imprint },
  privacy: { title: 'Privacy policy', body: Privacy },
  terms: { title: 'Terms', body: Terms },
  withdrawal: { title: 'Right of withdrawal', body: Withdrawal },
};

export default function Legal({ doc }: { doc: string }) {
  const d = DOCS[doc];
  if (!d) return <main className="screen center-fill">Not found</main>;
  const Body = d.body;
  return (
    <main className="screen legal-doc">
      <div className="topnav">
        <BackButton fallback="/" />
      </div>
      <h1 className="display app-title">{d.title}</h1>
      <p className="muted small">Last updated {formatLongDate(legal.lastUpdated)}</p>
      {legal.draft ? <p className="draft-banner">Draft — not yet reviewed by a lawyer. Not for production use.</p> : null}
      <Body />
    </main>
  );
}
