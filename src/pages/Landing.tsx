import { useEffect, useRef, useState } from 'react';
import assets from 'virtual:assets';
import { CreatorImage } from '../components/CreatorImage';
import { Icon } from '../components/Icon';
import creator from '../creator';
import { track } from '../lib/analytics';
import { getFunnel } from '../lib/funnel';
import { Link, navigate } from '../router';

const { landing } = creator.copy;

const SCREEN_LABEL = { plan: 'Your plan', player: 'Workout player', progress: 'Progress', today: 'Today' } as const;

function PhoneShot({ screen }: { screen: keyof typeof SCREEN_LABEL }) {
  const src = assets.screens[screen];
  return (
    <div className="phone" aria-hidden={!src}>
      {src ? (
        <img src={src} alt={`App screen: ${SCREEN_LABEL[screen]}`} loading="lazy" decoding="async" width={390} height={700} />
      ) : (
        <div className="phone-placeholder">App screen: {SCREEN_LABEL[screen]}</div>
      )}
    </div>
  );
}

function useCta(location: string) {
  const busy = useRef(false);
  return () => {
    if (busy.current) return; // double tap → one event, one navigation
    busy.current = true;
    track('cta_clicked', { location });
    const answered = Object.keys(getFunnel().answers).length;
    navigate(answered ? '/quiz/resume' : '/quiz/1');
  };
}

export default function Landing() {
  const heroCta = useRef<HTMLButtonElement>(null);
  const finalCta = useRef<HTMLElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const onHero = useCta('hero');
  const onSticky = useCta('sticky');
  const onFinal = useCta('final');

  useEffect(() => {
    track('landing_viewed', { path: window.location.pathname }, { once: 'landing_viewed' });
    // Warm up the quiz chunk while she reads.
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(cb) : setTimeout(cb, 1500));
    idle(() => void import('./Quiz'));
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    let heroVisible = true;
    let finalVisible = false;
    const update = () => setShowSticky(!heroVisible && !finalVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === heroCta.current) heroVisible = e.isIntersecting;
        if (e.target === finalCta.current) finalVisible = e.isIntersecting;
      }
      update();
    });
    if (heroCta.current) io.observe(heroCta.current);
    if (finalCta.current) io.observe(finalCta.current);
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing">
      <header className="topbar">
        <span className="wordmark">{creator.brand.logo.text}</span>
        {creator.identity.demo ? <span className="chip">Demo creator</span> : null}
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media">
          <CreatorImage source={creator.brand.images.hero} className="hero-img" priority width={720} height={720} />
          <a className="hero-handle" href={creator.identity.socials[0].url} target="_blank" rel="noopener noreferrer">
            {creator.identity.handle}
          </a>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">{landing.eyebrow}</p>
          <h1 id="hero-title" className="display hero-title">
            {landing.headline}
          </h1>
          <p className="hero-promise">{landing.promise}</p>
          <button ref={heroCta} className="btn btn-primary btn-block btn-lg" onClick={onHero}>
            {landing.cta}
          </button>
          <p className="cta-note">{landing.ctaNote}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="benefits-title">
        <h2 id="benefits-title" className="display section-title">
          {landing.benefitsTitle}
        </h2>
        <ul className="benefits">
          {landing.benefits.map((b) => (
            <li key={b.title} className="benefit">
              <PhoneShot screen={b.screen} />
              <div>
                <h3 className="benefit-title">{b.title}</h3>
                <p className="muted">{b.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="steps-title">
        <h2 id="steps-title" className="display section-title">
          {landing.stepsTitle}
        </h2>
        <ol className="steps">
          {landing.steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-num" aria-hidden>
                {i + 1}
              </span>
              <div>
                <h3 className="step-title">{s.title}</h3>
                <p className="muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section story" aria-labelledby="story-title">
        <CreatorImage source={creator.brand.images.story} className="story-img" width={600} height={720} />
        <div>
          <h2 id="story-title" className="display section-title">
            {landing.story.title}
          </h2>
          {landing.story.paragraphs.map((p) => (
            <p key={p} className="story-p">
              {p}
            </p>
          ))}
          <p className="signoff">{creator.voice.signOff}</p>
          <ul className="socials">
            {creator.identity.socials.map((s) => (
              <li key={s.platform}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {creator.results.length > 0 ? (
        <section className="section" aria-labelledby="results-title">
          <h2 id="results-title" className="display section-title">
            Real results
          </h2>
          <ul className="results">
            {creator.results.map((r) => (
              <li key={r.name} className="card">
                <p>“{r.quote}”</p>
                <p className="muted">— {r.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section" aria-labelledby="faq-title">
        <h2 id="faq-title" className="display section-title">
          Questions
        </h2>
        <div className="faq">
          {creator.copy.faq.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>
                <span>{f.q}</span>
                <Icon name="plus" size={20} />
              </summary>
              <p className="muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section ref={finalCta} className="section final-cta" aria-labelledby="final-title">
        <h2 id="final-title" className="display final-title">
          {landing.finalCta.headline}
        </h2>
        <p className="muted">{landing.finalCta.body}</p>
        <button className="btn btn-primary btn-block btn-lg" onClick={onFinal}>
          {landing.cta}
        </button>
      </section>

      <footer className="footer">
        <p className="health-note">{landing.healthNote}</p>
        <nav className="footer-links" aria-label="Legal">
          <Link to="/legal/imprint">Imprint</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/withdrawal">Right of withdrawal</Link>
          <Link to="/cancel">Cancel membership</Link>
          <Link to="/login">Log in</Link>
        </nav>
        <p className="muted small">
          © {new Date().getFullYear()} {creator.legal.operator.name} · {creator.identity.appName} with {creator.identity.name}
        </p>
      </footer>

      <div className={`sticky-cta${showSticky ? ' is-visible' : ''}`} aria-hidden={!showSticky}>
        <button className="btn btn-primary btn-block" onClick={onSticky} tabIndex={showSticky ? 0 : -1}>
          {landing.cta}
        </button>
      </div>
    </div>
  );
}
