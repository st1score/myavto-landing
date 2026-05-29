import Link from 'next/link';

type Item = { src: string; label: string; href: string };

/* CSS-only infinite logo marquee. Items rendered twice so the -50% keyframe
   loops seamlessly. variant controls idle color (makes=grayscale, brands=color). */
export default function Marquee({
  items, dur = '38s', reverse = false, variant = 'makes',
}: {
  items: Item[]; dur?: string; reverse?: boolean; variant?: 'makes' | 'brands';
}) {
  const set = items.map((it, i) => (
    <Link key={variant + i} className="logo-chip" href={it.href} title={it.label}>
      <img src={it.src} alt={it.label} loading="lazy" />
    </Link>
  ));
  return (
    <div className={`marquee marquee--${variant}`} style={{ ['--dur' as string]: dur }}>
      <div className={'marquee__track' + (reverse ? ' marquee__track--rev' : '')}>
        {set}{set}
      </div>
    </div>
  );
}
