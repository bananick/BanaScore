import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import * as api from '../api';
import { t } from '../i18n';
import { useToast } from '../toast';
import { PasswordInput } from '../components/PasswordInput';
import { ButtonLink } from '../components/Button';

export const AdminLogin: React.FC<{ onAuthed: () => void }> = ({ onAuthed }) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    try {
      const token = await api.login(password);
      api.adminToken.set(token);
      onAuthed();
    } catch {
      toast.error(t.wrongPassword);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ButtonLink to="/" variant="ghost">
          <ArrowLeft size={16} /> {t.home}
        </ButtonLink>
        <h1>{t.adminTitle}</h1>
      </header>
      <div className="card">
        <h2>{t.login}</h2>
        <PasswordInput
          value={password}
          onChange={setPassword}
          onEnter={submit}
          placeholder={t.password}
          autoFocus
        />
        <button onClick={submit} className="festive-button" disabled={busy}>
          {t.login}
        </button>
      </div>
    </div>
  );
};
