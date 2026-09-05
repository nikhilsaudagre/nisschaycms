'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users2, Calendar, Users, Settings, Pill, CreditCard } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Queue', href: '/queue', icon: Users2, badge: 'Live' },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Pharmacy', href: '/medicines', icon: Pill },
    { name: 'Billing', href: '/billing', icon: CreditCard },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 relative min-w-[56px] ${
                isActive
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-teal-600' : 'text-slate-500'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-black px-1 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-teal-800' : 'text-slate-500'}`}>
                {item.name}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-teal-600 absolute bottom-0.5"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
