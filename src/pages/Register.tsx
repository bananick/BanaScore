import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { t } from '../i18n';
import { useToast } from '../toast';

export const Register: React.FC = () => {
  const { token } = useParams();
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async () => {
    if (!pseudo.trim() || !token || busy) return;
    setBusy(true);
    const deviceId =
      localStorage.getItem('deviceId') || Math.random().toString(36).substring(2);
    localStorage.setItem('deviceId', deviceId);

    try {
      const p = await api.register({ pseudo: pseudo.trim(), qrToken: token, deviceId });
      const eventId = p.eventId ?? p.event_id;
      localStorage.setItem(`participant_event_${eventId}`, String(p.id));
      navigate(`/event/${eventId}`);
    } catch (err) {
      toast.error(api.apiErrorMessage(err, t.registrationError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-container">
      <h1>{t.readyToPlay}</h1>
      <div className="card">
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          placeholder={t.yourPseudo}
        />
        <button onClick={handleRegister} className="festive-button" disabled={busy}>
          {t.joinTeam}
        </button>
      </div>
    </div>
  );
};
