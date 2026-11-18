import { useEffect, useRef, useState } from 'react';
import { syncPendingOfflineWrites } from '../lib/firebase';

export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);
  const wasOfflineRef = useRef<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let syncedTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setIsOnline(false);
      setIsSyncing(false);
      setJustSynced(false);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsSyncing(true);
        await syncPendingOfflineWrites();
        setIsSyncing(false);
        setJustSynced(true);
        if (syncedTimer) clearTimeout(syncedTimer);
        syncedTimer = setTimeout(() => {
          setJustSynced(false);
        }, 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncedTimer) clearTimeout(syncedTimer);
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    justSynced,
  };
}
