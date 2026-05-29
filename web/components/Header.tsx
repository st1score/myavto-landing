'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/search', label: 'Каталог' },
  { href: '/search?category=PISTON', label: 'Поршни' },
  { href: '/search?category=RING', label: 'Кольца' },
  { href: '/search?category=BEARING', label: 'Вкладыши' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" onClick={() => setOpen(false)} className="font-extrabold text-lg tracking-tight shrink-0">
          MY <span className="text-[var(--c-red)]">AVTO</span>
        </Link>

        <nav className="hidden md:flex gap-5 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={'hover:text-[var(--c-red)] transition ' + (pathname === n.href ? 'text-[var(--c-red)] font-semibold' : '')}
            >{n.label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex gap-3 items-center text-sm">
          <a href="tel:+77015509377" className="hidden lg:inline hover:text-[var(--c-red)]">+7 701 550-93-77</a>
          <a
            href="https://wa.me/77015509377"
            target="_blank" rel="noopener"
            className="bg-[var(--c-red)] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-[var(--c-red-dark)] transition"
          >WhatsApp</a>
          <Link href="/dashboard" className="hidden md:inline text-neutral-500 hover:text-black text-xs">Кабинет</Link>

          <button
            type="button"
            aria-label="Меню"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden -mr-1 p-2 text-neutral-700"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>
                    : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-neutral-200 bg-white px-4 py-2 flex flex-col text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-2.5 border-b border-neutral-100 hover:text-[var(--c-red)]">{n.label}</Link>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)} className="py-2.5 text-neutral-500">Кабинет продавца</Link>
          <a href="tel:+77015509377" className="py-2.5 font-semibold">+7 701 550-93-77</a>
        </nav>
      )}
    </header>
  );
}
