'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
  }

  const nav = [
    { href: '/dashboard',              label: 'Мои товары' },
    { href: '/dashboard/home',         label: 'Главная страница' },
    { href: '/dashboard/new',          label: '+ Добавить' },
    { href: '/dashboard/export-kaspi', label: 'Экспорт → Каспи' },
    { href: '/dashboard/reference',    label: 'Справочники' },
  ];

  return (
    <AuthGuard>
      {(session) => (
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[220px_1fr] gap-8">
          <aside>
            <div className="text-sm text-neutral-500 mb-1">Кабинет продавца</div>
            <div className="text-sm font-semibold mb-4 truncate">{session.user.email}</div>
            <nav className="space-y-1 text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={'block px-3 py-2 rounded-md ' + (pathname === n.href ? 'bg-black text-white' : 'hover:bg-neutral-100')}
                >{n.label}</Link>
              ))}
              <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-md text-red-600 hover:bg-red-50 mt-4">Выйти</button>
            </nav>
          </aside>
          <div>{children}</div>
        </div>
      )}
    </AuthGuard>
  );
}
