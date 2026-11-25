'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// A horizontal scroller that opens at its right end (the most recent weeks),
// and stays left-aligned when everything fits.
export function ScrollEnd({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth;
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
