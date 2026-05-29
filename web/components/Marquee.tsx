'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

type Item = { src: string; label: string; href: string };

/* Auto-advancing logo carousel.
   - Touch: native horizontal scroll (finger drag with momentum). Auto-advance
     pauses on touch and resumes after idle.
   - Mouse: click-drag via pointer events.
   Items rendered twice for a seamless wrap. variant controls idle color. */
export default function Marquee({
  items, dur, reverse = false, variant = 'makes',
}: {
  items: Item[]; dur?: string; reverse?: boolean; variant?: 'makes' | 'brands';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const pauseUntil = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reverse ? -0.4 : 0.4;
    let raf = 0;
    const tick = () => {
      const half = el.scrollWidth / 2;
      if (!reduced && half > 0 && !drag.current.down && Date.now() > pauseUntil.current) {
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

  // Pause auto-advance while the finger is on the strip / just after.
  const pause = () => { pauseUntil.current = Date.now() + 2000; };

  // Mouse-only click-drag. Touch uses native scroll (do not hijack).
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
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
    if (!drag.current.down) return;
    drag.current.down = false;
    pause();
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
      onTouchStart={pause} onScroll={pause}
    >
      <div className="marquee__track">{set}{set}</div>
    </div>
  );
}
