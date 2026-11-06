'use client';

import React, { useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { SERVER_URL } from '@/lib/config';

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Avoid duplicate sync calls in the same session
    if (hasSyncedRef.current === user.id) return;
    try {
      if (sessionStorage.getItem('collabarch_user_synced') === user.id) {
        hasSyncedRef.current = user.id;
        return;
      }
    } catch {}

    const syncUser = async () => {
      try {
        const token = await getToken().catch(() => null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const payload = {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || `${user.id}@collabarch.internal`,
          name:
            user.fullName ||
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.username ||
            'Architect',
          avatarUrl: user.imageUrl || null,
        };

        const res = await fetch(`${SERVER_URL}/users/sync`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          hasSyncedRef.current = user.id;
          try {
            sessionStorage.setItem('collabarch_user_synced', user.id);
          } catch {}
          console.log('[UserSyncProvider] Successfully synced Clerk user to PostgreSQL:', user.id);
        } else {
          console.warn('[UserSyncProvider] Server returned non-ok status syncing user:', res.status);
        }
      } catch (err) {
        console.error('[UserSyncProvider] Failed to auto-sync user to server:', err);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user, getToken]);

  return <>{children}</>;
}
