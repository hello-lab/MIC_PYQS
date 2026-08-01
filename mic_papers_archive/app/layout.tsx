import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Press_Start_2P, Courier_Prime } from 'next/font/google';
import './globals.css';
import Sidebar from './components/navbar';

// Load Google Fonts via next/font/google
const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-courier-prime',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MIC_PYQs Vault — Archived Scrolls',
  description: 'Previous Year Question Papers Archive Division by MIC Innovations',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}

interface SubjectLinkItem {
  href: string;
  label: string;
  count: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { href: '/', label: 'Main Vault', icon: '🏠'},
  { href: '/new_upload', label: 'Submit New Papers', icon: '📜' },
];

const SUBJECT_LINKS: SubjectLinkItem[] = [
  { href: '/subject/mathematics', label: 'Mathematics', count: '2.4k' },
  { href: '/subject/physics', label: 'Physics', count: '1.8k' },
  { href: '/subject/cs', label: 'Computer Science', count: '5.1k' },
  { href: '/subject/chemistry', label: 'Chemistry', count: '942' },
];

export default function RootLayout({ children }: RootLayoutProps) {
  const logoUrl =
    '/globe.svg';

  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${courierPrime.variable}`}
    >
      <body className=" text-ink font-mono min-h-screen flex w-full antialiased">
        {/* SIDEBAR NAVIGATION */}
        <Sidebar logoUrl={logoUrl} />

        {/* MAIN CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 ">
          {/* STICKY TOP HEADER */}
          <header className="bg-mahog text-vellum px-8 py-4 flex items-center justify-between border-b-4 border-black sticky top-0 z-40">
            <div className="flex items-center gap-6">
              <div className="lg:hidden p-1 bg-white rounded-full">
                <Image
                  src={logoUrl}
                  alt="MIC Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="font-pixel text-xl text-gold uppercase">
                  THE GREAT ARCHIVE
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  
                </div>
              </div>
            </div>

            
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>

        
      </body>
    </html>
  );
}