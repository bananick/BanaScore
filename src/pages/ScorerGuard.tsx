import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import { t } from '../i18n';
import { useToast } from '../toast';

type State = 'checking' | 'ok' | 'need-code';

/** Gate scoring screens behind admin OR a per-event scorer code ("animateur"). */
export const ScorerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { eventId } = useParams();
  const [state, setState] = useState<State>('checking');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const verify = () => {
    api
      .checkScorerSession(eventId!)
      .then(() => setState('ok'))
      .catch(() => setState('need-code'));
  };
  useEffect(verify, [eventId]);

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      const token = await api.scorerLogin(eventId!, code.trim());
      api.scorerToken.setForEvent(Number(eventId), token);
      setState('ok');
    } catch {
      toast.error(t.scorerLoginFailed);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'checking') {
    return (
      <div className="app-container">
        <p>…</p>
      </div>
    );
  }

  if (state === 'need-code') {
    return (
      <div className="app-container">
        <h1 style={{ fontSize: '2rem' }}>✍️ {t.scorerAccess}</h1>
        <div className="card">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={t.enterScorerCode}
            autoFocus
          />
          <button onClick={submit} className="festive-button" disabled={busy}>
            {t.login}
          </button>
          <Link to="/admin" style={{ color: 'var(--accent)', display: 'inline-block', marginTop: 8 }}>
            {t.adminDashboard}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
