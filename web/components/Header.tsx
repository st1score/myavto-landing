'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { PHONE_HUMAN, WA_PHONE } from '@/lib/ui';

const NAV = [
  { href: '/search', label: 'Каталог' },
  { href: '/search?category=PISTON', label: 'Поршни' },
  { href: '/search?category=RING', label: 'Кольца' },
  { href: '/search?category=BEARING', label: 'Вкладыши' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={'hdr' + (stuck ? ' is-stuck' : '')}>
      <div className="hdr__bar">
        <Link className="logo" href="/" onClick={() => setOpen(false)}>
          <span className="logo__mark"><Icon name="piston" size={20} /></span>
          MY <b>AVTO</b>
        </Link>
        <nav className="hdr__nav">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <div className="hdr__spacer" />
        <div className="hdr__phone">
          <small>Алматы · ТЦ CarCity</small>
          <b className="mono">{PHONE_HUMAN}</b>
        </div>
        <div className="hdr__icons">
          <a className="btn btn--wa btn--sm" href={`https://wa.me/${WA_PHONE}`} target="_blank" rel="noopener">
            <Icon name="wa" size={18} /><span className="hdr__wa-text">WhatsApp</span>
          </a>
          <Link className="icon-btn icon-btn--cab" href="/dashboard" aria-label="Кабинет">
            <Icon name="user" size={19} />
          </Link>
          <button className="icon-btn burger" aria-label="Меню" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      <div className={'mmenu' + (open ? ' is-open' : '')}>
        <div className="mmenu__inner">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} onClick={() => setOpen(false)}>
              {n.label} <Icon name="chevR" size={18} />
            </Link>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            Кабинет продавца <Icon name="chevR" size={18} />
          </Link>
          <a className="mphone mono" href={`tel:${PHONE_HUMAN.replace(/[^+\d]/g, '')}`}>{PHONE_HUMAN}</a>
        </div>
      </div>
    </header>
  );
}
