'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Plays the theme's "changed" animation when `value` changes after the first
// render (a stamp in Afiş, an inverted flash in Sinyal).
export function Fresh({ value, children, className = '' }: { value: string | number; children: ReactNode; className?: string }) {
  const prev = useRef(value);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setVersion((v) => v + 1);
    }
  }, [value]);
  return (
    <span key={version} className={`${version ? 'fresh' : ''} ${className}`.trim() || undefined}>
      {children}
    </span>
  );
}
