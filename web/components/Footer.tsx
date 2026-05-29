import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { PHONE_HUMAN, WA_PHONE } from '@/lib/ui';

const SOCIALS: [slug: string, label: string, wa?: boolean][] = [
  ['whatsapp', 'WhatsApp', true], ['telegram', 'Telegram'], ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'], ['kaspi', 'Kaspi'], ['kolesa', 'Kolesa.kz'], ['olx', 'OLX'],
];

const SOCIAL_HREF: Record<string, string> = {
  whatsapp: `https://wa.me/${WA_PHONE}`,
  telegram: 'https://t.me/', instagram: '#', tiktok: '#', kaspi: '#', kolesa: '#', olx: '#',
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__brand">
          <div className="logo"><span className="logo__mark"><Icon name="piston" size={20} /></span> MY <b>AVTO</b></div>
          <p>Запчасти для капитального ремонта японских двигателей. Поршни, кольца, вкладыши, гильзы и ремкомплекты — оригинал и проверенные бренды.</p>
          <div className="addr">
            <div><Icon name="pin" size={17} /> Алматы, ТЦ CarCity, 3 ярус, бутик 135В</div>
            <div><Icon name="phone" size={17} /> <span className="mono">{PHONE_HUMAN}</span></div>
            <div><Icon name="clock" size={17} /> Пн–Сб 9:00–17:00 · Вс 11:00–16:00</div>
          </div>
        </div>
        <div className="footer__col">
          <h4>Каталог</h4>
          <Link href="/search?category=PISTON">Поршни</Link>
          <Link href="/search?category=RING">Поршневые кольца</Link>
          <Link href="/search?category=BEARING">Вкладыши</Link>
          <Link href="/search?category=LINER">Гильзы</Link>
          <Link href="/search?category=KIT">Ремкомплекты</Link>
        </div>
        <div className="footer__col">
          <h4>Бренды</h4>
          <Link href="/search?brand=TEIKIN">TEIKIN</Link>
          <Link href="/search?brand=NPR">NPR</Link>
          <Link href="/search?brand=RIKEN">RIKEN</Link>
          <Link href="/search?brand=TAIHO">TAIHO</Link>
          <Link href="/search?brand=IZUMI">IZUMI</Link>
        </div>
        <div className="footer__col">
          <h4>Мы на связи</h4>
          <p className="footer__social-title">Пишите и заказывайте удобным способом</p>
          <div className="socials">
            {SOCIALS.map(([slug, label, wa]) => (
              <a key={slug} className={'social' + (wa ? ' social--wa' : '')} href={SOCIAL_HREF[slug]} target="_blank" rel="noopener" aria-label={label} title={label}>
                <img src={`/assets/social/${slug}.png`} alt={label} loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <small>© 2026 MY AVTO · Запчасти для японских двигателей · Алматы</small>
          <div className="footer__pay"><Icon name="wallet" size={16} /> Оплата: Kaspi · наличные · перевод</div>
        </div>
      </div>
    </footer>
  );
}
