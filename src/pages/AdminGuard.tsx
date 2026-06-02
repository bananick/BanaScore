import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { AdminLogin } from './AdminLogin';

type AuthState = 'checking' | 'authed' | 'anon';

/** Gate admin pages behind a valid session token. */
export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>('checking');

  const verify = () => {
    if (!api.adminToken.isSet()) {
      setState('anon');
      return;
    }
    api
      .checkSession()
      .then(() => setState('authed'))
      .catch(() => {
        api.adminToken.clear();
        setState('anon');
      });
  };

  useEffect(verify, []);

  if (state === 'checking') {
    return (
      <div className="app-container">
        <p>…</p>
      </div>
    );
  }
  if (state === 'anon') {
    return <AdminLogin onAuthed={() => setState('authed')} />;
  }
  return <>{children}</>;
};
