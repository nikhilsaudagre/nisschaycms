'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { Appointment, Patient, Doctor, Medicine } from '@/types';
import {
  User as UserIcon,
  Search,
  Bell,
  Maximize,
  Minimize,
  X,
  Stethoscope,
  Users2,
  Pill,
  ChevronRight,
  Menu,
  Building,
  FileText,
  LogOut,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { LiveClock } from '@/components/live-clock';
import { Sidebar } from '@/components/sidebar';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Mobile Menu Drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User Profile Dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Search results
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [searchedDoctors, setSearchedDoctors] = useState<Doctor[]>([]);
  const [searchedMedicines, setSearchedMedicines] = useState<Medicine[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Queue Metrics state
  const [queueMetrics, setQueueMetrics] = useState({
    waiting: 0,
    inConsult: 0,
    completed: 0,
    emergency: 0
  });

  // Notification state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; type: 'emergency' | 'waiting' | 'info'; time: string; read: boolean }[]
  >([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // 1. Keyboard Shortcut listener for Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchedPatients([]);
      setSearchedDoctors([]);
      setSearchedMedicines([]);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const [patientsRes, doctorsRes, medicinesRes] = await Promise.all([
          apiClient.get<{ content?: Patient[] }>('/patients', {
            params: { search: debouncedQuery, size: 5 }
          }),
          apiClient.get<Doctor[]>('/doctors'),
          apiClient.get<Medicine[]>('/medicines/search', {
            params: { query: debouncedQuery }
          }).catch(() => ({ data: [] }))
        ]);

        setSearchedPatients(patientsRes.data.content || []);
        
        const q = debouncedQuery.toLowerCase();
        const docs = (doctorsRes.data || []).filter(
          d => (d.name || '').toLowerCase().includes(q) || (d.specialization || '').toLowerCase().includes(q)
        );
        setSearchedDoctors(docs.slice(0, 3));
        setSearchedMedicines((medicinesRes.data || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to perform global search', err);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // 3. Live Queue Ticker Data Fetching & Polling
  const fetchLiveQueue = async () => {
    if (!user) return;
    try {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const res = await apiClient.get<Appointment[]>('/appointments', {
        params: { date: todayStr }
      });
      const appts = res.data || [];

      const waiting = appts.filter(a => a.status === 'CHECKED_IN').length;
      const inConsult = appts.filter(a => a.status === 'IN_CONSULTATION').length;
      const completed = appts.filter(a => a.status === 'COMPLETED').length;
      const emergency = appts.filter(a => a.type === 'EMERGENCY' && a.status !== 'COMPLETED').length;

      setQueueMetrics({ waiting, inConsult, completed, emergency });

      // Generate live notifications dynamically from active queue state
      const notifs: { id: string; title: string; message: string; type: 'emergency' | 'waiting' | 'info'; time: string; read: boolean }[] = [];

      if (emergency > 0) {
        notifs.push({
          id: 'notif-emergency',
          title: '🚨 Emergency Priority',
          message: `${emergency} emergency patient(s) need immediate attention`,
          type: 'emergency',
          time: 'Just now',
          read: false
        });
      }

      if (waiting > 0) {
        notifs.push({
          id: 'notif-waiting',
          title: '⏳ Waiting in Lobby',
          message: `${waiting} patient(s) waiting in lounge for consultation`,
          type: 'waiting',
          time: 'Live status',
          read: false
        });
      }

      if (completed > 0) {
        notifs.push({
          id: 'notif-completed',
          title: '✅ Consultations Milestone',
          message: `${completed} consultation(s) completed today`,
          type: 'info',
          time: 'Today',
          read: true
        });
      }

      // 1. Fetch upcoming / active doctor leaves
      try {
        const leavesRes = await apiClient.get<any[]>('/doctors/leaves/upcoming');
        const upcomingLeaves = leavesRes.data || [];
        upcomingLeaves.forEach((leave) => {
          const docName = leave.doctorName ? `Dr. ${leave.doctorName.replace(/^dr\.?\s*/i, '')}` : 'Doctor';
          const reasonText = leave.reason ? ` (${leave.reason})` : '';
          const start = new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          const end = new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          const dateRange = start === end ? start : `${start} – ${end}`;

          notifs.push({
            id: `notif-leave-${leave.id}`,
            title: '📅 Doctor on Leave',
            message: `${docName} applied for leave from ${dateRange}${reasonText}`,
            type: 'waiting',
            time: 'Leave Notice',
            read: false
          });
        });
      } catch {}

      // 2. Fetch recent schedule alerts from local cache
      if (typeof window !== 'undefined') {
        const schedAlerts = localStorage.getItem('nisschay_admin_schedule_alerts');
        if (schedAlerts) {
          try {
            const parsed = JSON.parse(schedAlerts);
            if (Array.isArray(parsed)) {
              parsed.slice(0, 3).forEach((item: any) => {
                notifs.push({
                  id: `notif-sched-${item.id}`,
                  title: '🕒 OPD Hours Updated',
                  message: `${item.doctorName || 'Doctor'} updated OPD working hours`,
                  type: 'info',
                  time: item.time || 'Recently',
                  read: false
                });
              });
            }
          } catch {}
        }
      }

      setNotifications(notifs);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.message?.includes('Session expired')) {
        return;
      }
      console.warn('Live queue ticker paused:', err?.message || err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchLiveQueue();
    
    const interval = setInterval(fetchLiveQueue, 3000);

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveQueue();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [user]);

  // 4. Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    router.push('/login');
  };

  const handleNavigate = (path: string) => {
    setIsSearchOpen(false);
    router.push(path);
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-14 md:h-16 w-full md:w-auto my-0 md:my-3 mx-0 md:mr-3 bg-white/95 backdrop-blur-md border-b md:border border-[#E8EEF2] rounded-none md:rounded-2xl flex items-center justify-between px-3 sm:px-4 md:px-5 shrink-0 z-30 sticky top-0 md:top-3 shadow-xs transition-all gap-2 sm:gap-4">
        {/* Left / Center: Search Bar Trigger with Rectangle Design */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg bg-[#F6F9FB] hover:bg-[#E8EEF2] border border-[#E8EEF2] text-[#172B34] transition-colors shrink-0 cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-4.5 h-4.5 text-[#172B34]" />
          </button>

          {/* Search Trigger Button - Clean Rectangle Design */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-[#F6F9FB] hover:bg-white border border-[#E8EEF2] hover:border-[#087F8C]/40 rounded-lg px-3 py-2 text-xs font-medium text-[#567781] flex items-center justify-between transition-all group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <Search className="w-4 h-4 text-[#087F8C] group-hover:scale-105 transition-transform shrink-0" />
              <span className="truncate text-xs">Search patients, doctors...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-[#567781] bg-white border border-[#E8EEF2] rounded shadow-2xs shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Controls: Notifications & User Avatar */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Notifications Icon & Popover */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className="p-2 rounded-lg bg-[#F6F9FB] hover:bg-[#E8EEF2] border border-[#E8EEF2] text-[#567781] hover:text-[#172B34] relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#567781]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D64545] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E8EEF2] p-4 z-50 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-[#E8EEF2] pb-3">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#087F8C]" />
                    <h3 className="text-xs font-extrabold text-[#172B34] uppercase tracking-wider">
                      Live Alerts ({notifications.length})
                    </h3>
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[11px] font-bold text-[#087F8C] hover:text-[#076b77] cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-[#567781] text-xs font-semibold">
                      ✨ No active queue alerts right now
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          router.push('/queue');
                          setIsNotificationsOpen(false);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          notif.type === 'emergency'
                            ? 'bg-red-50/70 border-red-200 text-[#D64545]'
                            : notif.type === 'waiting'
                            ? 'bg-amber-50/70 border-amber-200 text-[#E9A23B]'
                            : 'bg-[#F6F9FB] border-[#E8EEF2]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-extrabold text-[#172B34]">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-medium text-[#567781]">{notif.time}</span>
                        </div>
                        <p className="text-[11px] font-medium text-[#567781] mt-1">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Dropdown */}
          <div className="relative pl-1 border-l border-[#E8EEF2]" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(prev => !prev)}
              className="flex items-center space-x-2 p-0.5 rounded-xl hover:bg-[#F6F9FB] border border-transparent hover:border-[#E8EEF2] transition-all cursor-pointer group"
              title="Open User Profile Menu"
            >
              <div className="relative">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={user?.name || 'User Profile'}
                    className="w-8.5 h-8.5 rounded-lg object-cover border border-[#E8EEF2] shadow-2xs bg-[#F6F9FB]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`;
                    }}
                  />
                ) : (
                  <div className="w-8.5 h-8.5 rounded-lg bg-[#087F8C] border border-[#087F8C]/40 flex items-center justify-center text-white font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-white" />}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#22A06B] border-2 border-white rounded-full"></span>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-[#E8EEF2] p-2.5 z-50 animate-scaleUp">
                {/* 1. User Identity Header Card */}
                <div className="p-3 rounded-xl bg-[#F6F9FB] border border-[#E8EEF2] mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#087F8C] text-white flex items-center justify-center font-extrabold text-sm shadow-2xs shrink-0 overflow-hidden border border-[#087F8C]/30">
                      {user?.profilePictureUrl ? (
                        <img
                          src={user.profilePictureUrl}
                          alt={user?.name || 'User Profile'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-xs sm:text-sm text-[#172B34] truncate">
                          {user?.name || 'User Account'}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20 uppercase tracking-wider font-mono">
                          {user?.role || 'STAFF'}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#567781] truncate mt-0.5">
                        {user?.email || 'user@nisschaycms.com'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Quick Navigation Options */}
                <div className="space-y-1">
                  {/* Account Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push('/profile?tab=account');
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#F6F9FB] flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center shrink-0 group-hover:bg-[#087F8C] group-hover:text-white transition-colors">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-[#172B34] group-hover:text-[#087F8C] transition-colors truncate">My Profile</p>
                        <p className="text-[10px] text-[#567781] font-medium truncate">Account details & password</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#567781]/40 group-hover:text-[#087F8C] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </button>

                  {/* Clinic Profile & Branding */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push('/profile?tab=clinic');
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#F6F9FB] flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#4FA8DB]/10 text-[#4FA8DB] flex items-center justify-center shrink-0 group-hover:bg-[#4FA8DB] group-hover:text-white transition-colors">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-[#172B34] group-hover:text-[#087F8C] transition-colors truncate">Clinic Settings</p>
                        <p className="text-[10px] text-[#567781] font-medium truncate">Logo, address & timings</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#567781]/40 group-hover:text-[#087F8C] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </button>

                  {/* Doctor Professional Fees & Signature */}
                  {(user?.role === 'DOCTOR' || user?.role === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        router.push('/profile?tab=professional');
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#F6F9FB] flex items-center justify-between text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#087F8C]/10 text-[#087F8C] flex items-center justify-center shrink-0 group-hover:bg-[#087F8C] group-hover:text-white transition-colors">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs text-[#172B34] group-hover:text-[#087F8C] transition-colors truncate">Doctor Fees & Sign</p>
                          <p className="text-[10px] text-[#567781] font-medium truncate">Consultation charges & signature</p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#567781]/40 group-hover:text-[#087F8C] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                    </button>
                  )}

                  {/* Rx Pad & Prescription Template */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push('/profile?tab=prescription');
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#F6F9FB] flex items-center justify-between text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#22A06B]/10 text-[#22A06B] flex items-center justify-center shrink-0 group-hover:bg-[#22A06B] group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-xs text-[#172B34] group-hover:text-[#087F8C] transition-colors truncate">Prescription Template</p>
                        <p className="text-[10px] text-[#567781] font-medium truncate">Header & footer print styling</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#567781]/40 group-hover:text-[#087F8C] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </button>
                </div>

                {/* 3. Divider & Logout */}
                <div className="border-t border-[#E8EEF2] mt-2 pt-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full p-2 rounded-xl text-[#D64545] hover:bg-red-50/70 flex items-center space-x-2.5 transition-colors cursor-pointer font-bold text-xs group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#D64545]/10 text-[#D64545] flex items-center justify-center shrink-0 group-hover:bg-[#D64545] group-hover:text-white transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 5. Pure Search Dialog Modal (Ctrl + K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-16 sm:pt-24 p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* Dialog Container */}
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 z-10 overflow-hidden animate-scaleUp">
            {/* Search Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
              <Search className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type to search patients, doctors, or medicines..."
                className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results Area */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {isSearching ? (
                <div className="py-8 text-center text-xs font-bold text-teal-600 dark:text-teal-400 animate-pulse">
                  Searching clinic database...
                </div>
              ) : searchQuery.trim() ? (
                <>
                  {/* Patients Section */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Users2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Patients ({searchedPatients.length})</span>
                    </div>
                    {searchedPatients.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1 pl-2">No matching patients found</div>
                    ) : (
                      <div className="space-y-1">
                        {searchedPatients.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleNavigate(`/patients/${p.id}`)}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                📞 {p.phone} {p.gender ? `• ${p.gender}` : ''}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Doctors Section */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                      <span>Doctors ({searchedDoctors.length})</span>
                    </div>
                    {searchedDoctors.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1 pl-2">No matching doctors found</div>
                    ) : (
                      <div className="space-y-1">
                        {searchedDoctors.map(d => (
                          <div
                            key={d.id}
                            onClick={() => handleNavigate('/doctors')}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                                {d.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Stethoscope className="w-3 h-3 text-[#087F8C]" />
                                <span>{d.specialization || 'General Physician'}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medicines Section */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-teal-600" />
                      <span>Medicines ({searchedMedicines.length})</span>
                    </div>
                    {searchedMedicines.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1 pl-2">No matching medicines found</div>
                    ) : (
                      <div className="space-y-1">
                        {searchedMedicines.map(m => (
                          <div
                            key={m.id}
                            onClick={() => handleNavigate('/medicines')}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                💊 {m.saltComposition || m.manufacturerName || 'Pharmacy Item'}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center space-y-2">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  <p>Type to search patients, doctors, or medicines in database</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400 font-medium">
              <span>Press <kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold">Esc</kbd> to close</span>
              <span>Database Search Mode</span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[80vw] bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-slideRight">
            <div className="absolute top-4 right-3">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar isMobileDrawer onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
