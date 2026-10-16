// Small shared UI pieces. Styling lives in styles.css and only uses theme tokens.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { back } from '../router';
import { Icon } from './Icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean; busy?: boolean };

export function Button({ variant = 'primary', block, busy, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${className ? ' ' + className : ''}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="spinner" aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
}

export function BackButton({ fallback, label = 'Back' }: { fallback: string; label?: string }) {
  return (
    <button className="icon-btn" onClick={() => back(fallback)} aria-label={label}>
      <Icon name="back" />
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={`screen ${className ?? ''}`}>{children}</main>;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="center-fill" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
