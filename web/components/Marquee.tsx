'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

type Item = { src: string; label: string; href: string };

/* Drag-scrollable + auto-advancing logo carousel. Works on touch (real scroll
   container) and auto-loops via rAF. Items rendered twice for seamless wrap.
   variant controls idle color (makes=grayscale, brands=color). */
export default function Marquee({
  items, dur = '38s', reverse = false, variant = 'makes',
}: {
  items: Item[]; dur?: string; reverse?: boolean; variant?: 'makes' | 'brands';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const pauseUntil = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const speed = reverse ? -0.5 : 0.5;
    let raf = 0;
    const tick = () => {
      const half = el.scrollWidth / 2;
      if (half > 0 && !drag.current.down && Date.now() > pauseUntil.current) {
        let next = el.scrollLeft + speed;
        if (next >= half) next -= half;
        if (next < 0) next += half;
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reverse]);

  const onDown = (e: React.PointerEvent) => {
    const el = ref.current!;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const el = ref.current!;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current.down = false;
    pauseUntil.current = Date.now() + 1800;
    ref.current?.releasePointerCapture(e.pointerId);
  };

  const set = items.map((it, i) => (
    <Link
      key={variant + i} className="logo-chip" href={it.href} title={it.label}
      onClick={(e) => { if (drag.current.moved) e.preventDefault(); }} draggable={false}
    >
      <img src={it.src} alt={it.label} loading="lazy" draggable={false} />
    </Link>
  ));

  return (
    <div
      ref={ref} className={`marquee marquee--${variant}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      <div className="marquee__track">{set}{set}</div>
    </div>
  );
}
