'use client';

import { useRouter } from 'next/navigation';
import { messages, type Locale } from '@/lib/i18n';

export function DateJump({ value, max, base, locale }: { value: string; max: string; base: string; locale: Locale }) {
  const router = useRouter();
  return (
    <label className="datejump">
      <span className="sr-only">{messages(locale).day.pickDate}</span>
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
