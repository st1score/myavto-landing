'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

type Item = { src: string; label: string; href: string };

/* Auto-advancing logo carousel.
   - Speed is time-based (px/ms), so 60Hz and 120Hz ProMotion screens move at
     the same pace (fixes the old "too fast on mobile" bug).
   - Position kept as a float; mobile floors scrollLeft to an int, so a float
     accumulator is required or sub-pixel steps never commit (carousel froze).
   - Touch = native horizontal scroll (finger drag). Mouse = JS click-drag.
   Items rendered twice for a seamless wrap. variant controls idle color. */
export default function Marquee({
  items, reverse = false, variant = 'makes',
}: {
  items: Item[]; reverse?: boolean; variant?: 'makes' | 'brands';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const pauseUntil = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const v = (reverse ? -1 : 1) * 0.03; // px per ms ≈ 30 px/s
    let raf = 0, last = 0, pos = el.scrollLeft;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(ts - last, 50); // clamp after tab-switch
      last = ts;
      const half = el.scrollWidth / 2;
      if (half > 0 && !drag.current.down && Date.now() > pauseUntil.current) {
        pos += v * dt;
        if (pos >= half) pos -= half;
        if (pos < 0) pos += half;
        el.scrollLeft = pos;
      } else {
        pos = el.scrollLeft; // user is in control → keep float in sync
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reverse]);

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
      onTouchStart={pause} onTouchMove={pause}
    >
      <div className="marquee__track">{set}{set}</div>
    </div>
  );
}
