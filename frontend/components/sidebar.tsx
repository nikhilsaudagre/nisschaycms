'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Lock,
  LucideIcon,
  Stethoscope,
  Pill,
  ChevronLeft,
  ChevronRight,
  Users2,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: LucideIcon;
  disabled: boolean;
  badge?: string;
  roles?: string[];
  section?: 'main' | 'clinical' | 'management';
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = user?.role?.toUpperCase() || 'ADMIN';

  const rawMenuItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'main' },
    { name: 'Live Queue & Lounge', href: '/queue', icon: Users2, disabled: false, badge: 'LIVE', roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Appointments', href: '/appointments', icon: Calendar, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Patients Directory', href: '/patients', icon: Users, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Doctor Profiles', href: '/doctors', icon: UserCheck, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'], section: 'clinical' },
    { name: 'Pharmacy Stock', href: '/medicines', icon: Pill, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'], section: 'clinical' },
    { name: 'Billing POS', href: '#', icon: CreditCard, disabled: true, badge: 'Soon', section: 'management' },
    { name: 'Analytics & Reports', href: '/reports', icon: BarChart3, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'], section: 'management' },
    { name: 'Clinic Settings', href: '/profile', icon: Settings, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'management' },
  ];

  const menuItems = rawMenuItems.filter(item => 
    !item.roles || item.roles.includes(role)
  );

  const mainItems = menuItems.filter(i => i.section === 'main');
  const clinicalItems = menuItems.filter(i => i.section === 'clinical');
  const managementItems = menuItems.filter(i => i.section === 'management');

  const renderNavGroup = (title: string, items: SidebarItem[]) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

        if (item.disabled) {
          return (
            <div
              key={item.name}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium text-slate-500/60 cursor-not-allowed rounded-xl transition-all`}
              title={`${item.name} (Coming Soon)`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0 opacity-50" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!isCollapsed && (
                item.badge ? (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                ) : (
                  <Lock className="w-3.5 h-3.5 opacity-40 shrink-0" />
                )
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            title={isCollapsed ? item.name : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${
              isActive
                ? 'bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30 border-l-2 border-teal-400 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </div>
            {!isCollapsed && (
              item.badge ? (
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                  item.badge === 'LIVE'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800/80 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              ) : isActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              ) : null
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className={`my-3 ml-3 flex flex-col h-[calc(100vh-1.5rem)] ${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900/98 text-slate-300 rounded-2xl border border-slate-800/80 shadow-2xl shrink-0 relative z-30 transition-all duration-300 select-none`}>
      
      {/* Clinic Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40 rounded-t-2xl">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-gradient-to-tr from-teal-500 to-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-teal-900/40 ring-1 ring-white/20 shrink-0">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-sm font-extrabold text-white tracking-tight block leading-none">Nisschay CMS</span>
              <span className="text-[10px] text-teal-400 font-bold tracking-wider uppercase block mt-1">Clinical Suite</span>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Menu Links grouped */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto custom-scrollbar">
        {renderNavGroup('Overview', mainItems)}
        {renderNavGroup('Clinical', clinicalItems)}
        {renderNavGroup('Management', managementItems)}
      </nav>

      {/* User Pro Badge & Logout Action */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 rounded-b-2xl space-y-2">
        <div className={`bg-slate-800/50 p-2.5 rounded-xl border border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
          </div>
          {!isCollapsed && (
            <div className="truncate min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Practitioner'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-teal-950 text-teal-400 border border-teal-800/60">
                  {user?.role || 'Staff'}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-center space-x-2 px-3'} py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 border border-transparent hover:border-rose-900/40 transition-all`}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

