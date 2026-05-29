'use client';
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/* Scroll-reveal wrapper. Adds `.is-in` when the element enters the viewport.
   - variant="reveal"  → fade + slide the element itself
   - variant="stagger" → fade + slide each direct child with an incremental delay
   Honors prefers-reduced-motion via the CSS in globals.css. */
export default function Reveal({
  as: Tag = 'div',
  variant = 'reveal',
  step = 60,
  className = '',
  children,
  ...rest
}: {
  as?: ElementType;
  variant?: 'reveal' | 'stagger';
  step?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          el.classList.add('is-in');
          if (variant === 'stagger') {
            Array.from(el.children).forEach((ch, i) => {
              (ch as HTMLElement).style.transitionDelay = i * step + 'ms';
            });
          }
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [variant, step]);

  return (
    <Tag ref={ref as never} className={`${variant} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
