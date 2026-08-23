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
  ChevronRight
} from 'lucide-react';
import { LiveClock } from '@/components/live-clock';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

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
    try {
      const todayStr = new Date().toISOString().split('T')[0];
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
          title: '🚨 Emergency Visit Priority',
          message: `${emergency} emergency patient(s) need immediate attention`,
          type: 'emergency',
          time: 'Just now',
          read: false
        });
      }

      if (waiting > 0) {
        notifs.push({
          id: 'notif-waiting',
          title: '⏳ Patients Seated in Lounge',
          message: `${waiting} patient(s) waiting in lounge for doctor consultation`,
          type: 'waiting',
          time: 'Live status',
          read: false
        });
      }

      if (completed > 0) {
        notifs.push({
          id: 'notif-completed',
          title: '✅ Consultations Milestone',
          message: `${completed} consultation(s) completed today successfully`,
          type: 'info',
          time: 'Today',
          read: true
        });
      }

      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to fetch live queue for navbar', err);
    }
  };

  useEffect(() => {
    fetchLiveQueue();
    const interval = setInterval(fetchLiveQueue, 15000);
    return () => clearInterval(interval);
  }, []);

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

  // Close notifications popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path: string) => {
    setIsSearchOpen(false);
    router.push(path);
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-16 my-3 mr-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-between px-5 shrink-0 z-20 sticky top-3 shadow-xs transition-all">
        {/* Search Trigger Button */}
        <div className="flex items-center space-x-4 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between transition-all group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center space-x-2.5">
              <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
              <span>Search patients, doctors, or medicines...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Center Live Patient Queue Ticker (Clickable to /queue) */}
        <button
          type="button"
          onClick={() => router.push('/queue')}
          title="Click to view full queue workspace"
          className="hidden lg:flex items-center space-x-3 px-4 py-1.5 bg-slate-100/80 dark:bg-slate-800/50 hover:bg-teal-50/70 dark:hover:bg-teal-950/40 border border-slate-200/60 dark:border-slate-700/50 rounded-xl text-xs transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Waiting:</span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-xs">{queueMetrics.waiting}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">In Consult:</span>
            <span className="font-extrabold text-teal-600 dark:text-teal-400 font-mono text-xs">{queueMetrics.inConsult}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Completed:</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{queueMetrics.completed}</span>
          </div>
          {queueMetrics.emergency > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 font-bold text-[11px] animate-bounce">
                <span>🚨 {queueMetrics.emergency} Emergency</span>
              </div>
            </>
          )}
        </button>

        {/* Right Controls: Fullscreen, Live Clock, Notifications & User Info */}
        <div className="flex items-center space-x-3">
          {/* Fullscreen Mode Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
            title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>

          {/* Live Clock Widget */}
          <div className="hidden md:block bg-teal-50/80 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60 text-teal-800 dark:text-teal-300 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
            <LiveClock iconClassName="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>

          {/* Notifications Icon & Popover */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Live Alerts ({notifications.length})
                    </h3>
                  </div>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
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
                            ? 'bg-red-50/70 dark:bg-red-950/40 border-red-200 dark:border-red-800/60'
                            : notif.type === 'waiting'
                            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400">{notif.time}</span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="relative">
              {user?.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user?.name || 'User Profile'}
                  className="w-9 h-9 rounded-xl object-cover border-2 border-teal-400/40 shadow-xs bg-slate-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`;
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 border border-teal-400/40 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-white" />}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
            </div>
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
                      <Users2 className="w-3.5 h-3.5 text-teal-500" />
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
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                📞 {p.phone} {p.gender ? `• ${p.gender}` : ''}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Doctors Section */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />
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
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                {d.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                🩺 {d.specialization || 'General Physician'}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Medicines Section */}
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-indigo-500" />
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
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                💊 {m.saltComposition || m.manufacturerName || 'Pharmacy Item'}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
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
    </>
  );
};
