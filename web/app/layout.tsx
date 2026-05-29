import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'MY AVTO — запчасти для капремонта двигателя',
  description: 'Поршни, кольца, вкладыши, гильзы и ремкомплекты для японских двигателей. Алматы.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-neutral-200 sticky top-0 bg-white/95 backdrop-blur z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <Link href="/" className="font-extrabold text-lg tracking-tight">
              MY <span className="text-[var(--c-red)]">AVTO</span>
            </Link>
            <nav className="hidden md:flex gap-5 text-sm">
              <Link href="/search" className="hover:text-[var(--c-red)]">Каталог</Link>
              <Link href="/search?category=PISTON" className="hover:text-[var(--c-red)]">Поршни</Link>
              <Link href="/search?category=RING" className="hover:text-[var(--c-red)]">Кольца</Link>
              <Link href="/search?category=BEARING" className="hover:text-[var(--c-red)]">Вкладыши</Link>
            </nav>
            <div className="ml-auto flex gap-3 items-center text-sm">
              <a href="tel:+77015509377" className="hidden md:inline hover:text-[var(--c-red)]">+7 701 550-93-77</a>
              <a
                href="https://wa.me/77015509377"
                target="_blank" rel="noopener"
                className="bg-[var(--c-red)] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-[var(--c-red-dark)]"
              >WhatsApp</a>
              <Link href="/dashboard" className="text-neutral-500 hover:text-black text-xs">Кабинет</Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-neutral-950 text-neutral-400 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-10 flex flex-wrap gap-8 justify-between text-sm">
            <div>
              <div className="text-white font-extrabold mb-2">MY <span className="text-[var(--c-red)]">AVTO</span></div>
              <p className="max-w-xs">Запчасти для капремонта двигателя. Алматы, ТЦ CarCity, 3 ярус, бутик 135В.</p>
            </div>
            <div className="space-y-1">
              <div className="text-white font-semibold mb-2">Контакты</div>
              <a href="tel:+77015509377" className="block hover:text-white">+7 701 550-93-77</a>
              <a href="https://wa.me/77015509377" target="_blank" rel="noopener" className="block hover:text-white">WhatsApp</a>
              <span className="block text-xs">Пн–Сб 9–17 · Вс 11–16</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
