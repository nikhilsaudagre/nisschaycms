import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Nisschay CMS - Premium Clinic Management System',
  description: 'A lightweight, secure, and modern Clinic Management System tailored for doctors and receptionists.',
  keywords: 'clinic management system, medical software, doctor dashboard, clinic portal, health tech',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-slate-50/70 text-slate-800 h-full flex flex-col selection:bg-teal-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
