'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoadingScreen } from './loading-screen';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isLoading && isAuthenticated && user) {
      const role = user.role?.toUpperCase();

      // Restricted pages for Receptionist
      if (role === 'RECEPTIONIST') {
        const restrictedPaths = ['/reports', '/doctors', '/medicines'];
        if (restrictedPaths.some(p => pathname?.startsWith(p))) {
          router.push('/appointments');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />; // Return loading screen during redirect
  }

  return <>{children}</>;
};
