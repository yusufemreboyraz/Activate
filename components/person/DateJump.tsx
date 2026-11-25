'use client';

import { useRouter } from 'next/navigation';

export function DateJump({ value, max, base }: { value: string; max: string; base: string }) {
  const router = useRouter();
  return (
    <label className="datejump">
      <span className="sr-only">Tarih seç</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => {
          const v = e.target.value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= max) router.push(`${base}${base.includes('?') ? '&' : '?'}d=${v}`, { scroll: false });
        }}
      />
    </label>
  );
}
