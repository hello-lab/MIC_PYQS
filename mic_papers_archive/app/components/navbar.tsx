'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: '/', label: 'Main Vault', icon: '🏠' },
  { href: '/new_upload', label: 'Submit New Papers', icon: '📜' },
];

export default function Sidebar({ logoUrl }: { logoUrl: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] bg-mahog text-vellum flex flex-col shrink-0 border-r-4 border-black relative hidden lg:flex">
      {/* Brand Header */}
      <div className="p-8 border-b-4 border-black bg-mahogLight">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-2 bg-white rounded-full pixel-border-sm relative w-24 h-24 flex items-center justify-center">
            <Image
              src={logoUrl}
              alt="MIC Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h2 className="font-pixel text-[10px] text-gold leading-tight uppercase">
              MIC INNOVATIONS
            </h2>
            <p className="text-[8px] text-amber-200/50 mt-2 tracking-widest font-pixel">
              ARCHIVE DIVISION
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 font-pixel">
        {NAV_LINKS.map((link) => {
          // Dynamic active check
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-4 py-3 transition-colors group ${
                isActive
                  ? 'bg-gold/10 border-2 border-gold/30 text-gold'
                  : 'hover:bg-white/5'
              }`}
            >
              <span
                className={`text-lg ${
                  !isActive && 'opacity-60 group-hover:opacity-100'
                }`}
              >
                {link.icon}
              </span>
              <span className="text-sm font-bold">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}