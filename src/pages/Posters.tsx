import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from '../api';
import type { ActivityDTO, EventDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { Button, ButtonLink } from '../components/Button';

/**
 * Print-friendly A4 sheet of QR codes for the event. Two kinds:
 *  - One scoring QR per activity (→ opens that activity's scoring on a tablet).
 *  - Team / event QRs (only useful when participant voting is enabled).
 * QRs use the server's LAN URL so they work when scanned from other devices.
 */
export const Posters: React.FC = () => {
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);

  useEffect(() => {
    Promise.all([api.getEvent(id!), api.getTeams(id!), api.getActivities(id!)])
      .then(([ev, tr, ar]) => {
        setEvent(ev);
        setTeams(tr);
        setActivities(ar);
      })
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    api.getNetwork().then(setBaseUrl).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const votingEnabled = event ? !!event.voting_enabled : true;

  return (
    <div className="app-container posters">
      <div className="report-actions no-print">
        <ButtonLink to={`/admin/event/${id}`} variant="ghost">
          <ArrowLeft size={16} /> {t.eventManagement}
        </ButtonLink>
        <Button onClick={() => window.print()} variant="blue">
          <Printer size={16} /> {t.print}
        </Button>
      </div>

      <header className="posters-head">
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{event?.name ?? '…'}</h1>
      </header>

      {/* Scoring QRs — one tablet per activity */}
      <h2 style={{ fontSize: '1.2rem' }}>✍️ {t.tabletScoringQr}</h2>
      <div className="posters-grid">
        {activities.map((a) => (
          <div key={a.id} className="poster-card poster-event">
            <div className="poster-qr">
              <QRCodeSVG value={`${baseUrl}/score/${id}/a/${a.id}`} size={170} />
            </div>
            <div className="poster-name">
              {a.workshop ? `${a.workshop} · ` : ''}
              {a.name}
            </div>
            <div className="poster-sub">{t.scanToScore}</div>
          </div>
        ))}
        {activities.length === 0 && <p>{t.noData}</p>}
      </div>

      {/* Team / event join QRs — only when participants vote */}
      {votingEnabled && (
        <>
          <h2 style={{ fontSize: '1.2rem', marginTop: 24 }}>🗳️ {t.teamQr}</h2>
          <div className="posters-grid">
            <div className="poster-card">
              <div className="poster-qr">
                <QRCodeSVG value={`${baseUrl}/join/${id}`} size={170} />
              </div>
              <div className="poster-name">🍌 {t.joinEvent}</div>
              <div className="poster-sub">{t.eventQr}</div>
            </div>
            {teams.map((team) => (
              <div key={team.id} className="poster-card">
                <div className="poster-qr">
                  <QRCodeSVG value={`${baseUrl}/register/${team.qr_token}`} size={170} />
                </div>
                <div className="poster-name">{team.name}</div>
                <div className="poster-sub">{t.scanToJoin}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
