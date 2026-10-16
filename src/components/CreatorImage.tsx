// Creator photo with fallbacks (self-hosted file → public profile picture → placeholder).
// The placeholder is obviously a placeholder (design.md), never a stock photo.

import { useState } from 'react';
import type { CreatorImageSource } from '../../creators/schema';

interface Props {
  source: CreatorImageSource;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}

export function CreatorImage({ source, className, priority, width, height }: Props) {
  const candidates = [source.src, ...source.fallbacks].filter(Boolean);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) {
    return (
      <div className={`img-placeholder ${className ?? ''}`} role="img" aria-label={`Placeholder for: ${source.alt}`}>
        <span>Placeholder · {source.alt}</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={source.alt}
      width={width}
      height={height}
      style={{ objectPosition: source.focus }}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      // React 19 passes fetchPriority through to the DOM.
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
