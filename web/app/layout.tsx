import type { Metadata } from 'next';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'MY AVTO — запчасти для капремонта двигателя',
  description: 'Поршни, кольца, вкладыши, гильзы и ремкомплекты для японских двигателей. Алматы.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <Header />

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
