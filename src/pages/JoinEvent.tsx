import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import type { EventDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';

/** Public page reached by the event-level QR: pick a team, then register. */
export const JoinEvent: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.getEvent(eventId!), api.getTeams(eventId!)])
      .then(([ev, tr]) => {
        setEvent(ev);
        setTeams(tr);
      })
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const register = async () => {
    if (!team || !pseudo.trim() || busy) return;
    setBusy(true);
    const deviceId = localStorage.getItem('deviceId') || Math.random().toString(36).substring(2);
    localStorage.setItem('deviceId', deviceId);
    try {
      const p = await api.register({ pseudo: pseudo.trim(), qrToken: team.qr_token, deviceId });
      const evId = p.eventId ?? p.event_id;
      localStorage.setItem(`participant_event_${evId}`, String(p.id));
      navigate(`/event/${evId}`);
    } catch (err) {
      toast.error(api.apiErrorMessage(err, t.registrationError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-container">
      <h1 style={{ fontSize: '2rem' }}>{event?.name ?? t.joinEvent}</h1>
      {!team ? (
        <div className="card">
          <h2>{t.chooseTeam}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {teams.map((tm) => (
              <button
                key={tm.id}
                className="card vote-card"
                style={{ margin: 0, padding: 18 }}
                onClick={() => setTeam(tm)}
              >
                <h3 style={{ margin: 0 }}>{tm.name}</h3>
              </button>
            ))}
          </div>
          {teams.length === 0 && <p>{t.noData}</p>}
        </div>
      ) : (
        <div className="card">
          <h2>{team.name}</h2>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && register()}
            placeholder={t.yourPseudo}
            autoFocus
          />
          <button onClick={register} className="festive-button" disabled={busy}>
            {t.joinTeam}
          </button>
          <button
            onClick={() => setTeam(null)}
            className="festive-button"
            style={{ background: 'var(--secondary)', color: 'white' }}
          >
            ← {t.chooseTeam}
          </button>
        </div>
      )}
    </div>
  );
};
