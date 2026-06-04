import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from '../api';
import type { EventDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';

/** Print-friendly A4 sheet of QR codes: one per team + an event-level QR. */
export const Posters: React.FC = () => {
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);

  useEffect(() => {
    Promise.all([api.getEvent(id!), api.getTeams(id!)])
      .then(([ev, tr]) => {
        setEvent(ev);
        setTeams(tr);
      })
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const origin = window.location.origin;

  return (
    <div className="app-container posters">
      <div className="report-actions no-print">
        <Link to={`/admin/event/${id}`} style={{ color: 'white' }}>
          ← {t.eventManagement}
        </Link>
        <button
          onClick={() => window.print()}
          className="festive-button"
          style={{ width: 'auto', marginTop: 0 }}
        >
          <Printer size={16} /> {t.print}
        </button>
      </div>

      <header className="posters-head">
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{event?.name ?? '…'}</h1>
        <p style={{ opacity: 0.7 }}>{t.scanToJoin}</p>
      </header>

      <div className="posters-grid">
        {/* Event-level QR (pick a team after scanning) */}
        <div className="poster-card poster-event">
          <div className="poster-qr">
            <QRCodeSVG value={`${origin}/join/${id}`} size={180} />
          </div>
          <div className="poster-name">🍌 {t.joinEvent}</div>
          <div className="poster-sub">{t.eventQr}</div>
        </div>

        {teams.map((team) => (
          <div key={team.id} className="poster-card">
            <div className="poster-qr">
              <QRCodeSVG value={`${origin}/register/${team.qr_token}`} size={180} />
            </div>
            <div className="poster-name">{team.name}</div>
            <div className="poster-sub">{t.scanToJoin}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
