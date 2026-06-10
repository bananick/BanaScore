import React, { useEffect, useState } from 'react';
import { t } from '../i18n';

/** Fixed banner shown when the device loses network (Wi-Fi drop during an event). */
export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;
  return <div className="offline-banner">⚠️ {t.offline}</div>;
};
