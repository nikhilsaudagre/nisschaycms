'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="h-screen flex overflow-hidden bg-slate-50 print:h-auto print:overflow-visible print:bg-white print:block">
        {/* Sidebar */}
        <div className="no-print print:hidden">
          <Sidebar />
        </div>

        {/* Core Frame */}
        <div className="flex-1 flex flex-col overflow-hidden print:h-auto print:overflow-visible print:block">
          {/* Top Bar */}
          <div className="no-print print:hidden">
            <Navbar />
          </div>

          {/* Main Context Screen */}
          <main className="flex-1 overflow-y-auto p-8 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
