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
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Users2,
  FileCheck2,
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

interface SidebarProps {
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobileDrawer = false }) => {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const role = user?.role?.toUpperCase() || 'ADMIN';

  const rawMenuItems: SidebarItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'main' },
    { name: 'Patient Queue', href: '/queue', icon: Users2, disabled: false, badge: 'LIVE', roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Appointments', href: '/appointments', icon: Calendar, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Patients', href: '/patients', icon: Users, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Pharmacy', href: '/medicines', icon: Pill, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Diagnostic Lab', href: '/lab', icon: FlaskConical, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Discharge Centre', href: '/discharge-centre', icon: FileCheck2, disabled: false, badge: 'DOCS', roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'clinical' },
    { name: 'Doctors & Staff', href: '/doctors', icon: UserCheck, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'], section: 'management' },
    { name: 'Billing & Invoices', href: '/billing', icon: CreditCard, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'management' },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR'], section: 'management' },
    { name: 'Settings', href: '/profile', icon: Settings, disabled: false, roles: ['ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN', 'DOCTOR', 'RECEPTIONIST'], section: 'management' },
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
        <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-[#567781] uppercase tracking-wider">
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
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 text-xs font-medium text-[#567781]/60 cursor-not-allowed rounded-lg transition-all`}
              title={`${item.name} (Coming Soon)`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0 opacity-40" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!isCollapsed && (
                item.badge ? (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#172B34] text-[#567781] border border-white/10">
                    {item.badge}
                  </span>
                ) : (
                  <Lock className="w-3.5 h-3.5 opacity-30 shrink-0" />
                )
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => {
              if (onClose) onClose();
            }}
            title={isCollapsed ? item.name : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'} py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group relative ${
              isActive
                ? 'bg-[#087F8C] text-white shadow-sm'
                : 'text-[#E8EEF2]/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-[#E8EEF2]/75 group-hover:text-white'}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </div>
            {!isCollapsed && (
              item.badge ? (
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                  item.badge === 'LIVE'
                    ? 'bg-[#22A06B] text-white animate-pulse shadow-xs'
                    : 'bg-[#087F8C]/40 text-white'
                }`}>
                  {item.badge}
                </span>
              ) : null
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className={`${isMobileDrawer ? 'flex flex-col h-full w-full' : 'hidden md:flex flex-col my-3 ml-3 h-[calc(100vh-1.5rem)]'} ${!isMobileDrawer && isCollapsed ? 'w-20' : 'w-64'} bg-[#0B2533] text-white ${!isMobileDrawer ? 'rounded-2xl border border-[#0B2533] shadow-xl' : ''} shrink-0 relative z-30 transition-all duration-200 select-none`}>
      
      {/* Clinic Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-[#0B2533] rounded-t-2xl">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-[#087F8C] p-2 rounded-xl text-white shadow-md shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-sm font-extrabold text-white tracking-tight block leading-none">Nisschay CMS</span>
              <span className="text-[10px] text-[#4FA8DB] font-bold tracking-wider uppercase block mt-1">Clinical Suite</span>
            </div>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#E8EEF2] hover:text-white transition-colors cursor-pointer"
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
      <div className="p-3 border-t border-white/10 bg-[#0B2533] rounded-b-2xl space-y-2">
        <div className={`bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-full bg-[#087F8C] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs overflow-hidden border border-white/20">
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'D'}</span>
            )}
          </div>
          {!isCollapsed && (
            <div className="truncate min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Doctor'}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] text-[#567781] font-semibold">
                  {user?.role || 'Administrator'}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-center space-x-2 px-3'} py-2 rounded-xl text-xs font-semibold text-[#E8EEF2]/75 hover:bg-rose-950/60 hover:text-rose-300 border border-transparent hover:border-rose-900/50 transition-all cursor-pointer`}
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

