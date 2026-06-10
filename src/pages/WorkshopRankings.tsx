import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { EventDTO, WorkshopRanking } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';
import { computeRanks, rankBadge } from '../ranks';
import { BackButton } from '../components/BackButton';

/** Top 3 of each atelier (workshop), with ex-æquo handling. Auto-refreshing. */
export const WorkshopRankings: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopRanking[]>([]);

  usePolling(
    () => {
      Promise.all([api.getEvent(id!), api.rankingWorkshops(id!)])
        .then(([ev, w]) => {
          setEvent(ev);
          setWorkshops(w);
        })
        .catch(() => undefined);
    },
    5000,
    [id],
  );

  const brandStyle = event?.brand_color
    ? ({ ['--primary']: event.brand_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="app-container" style={brandStyle}>
      <div className="page-top">
        <BackButton to={`/event/${id}`} />
      </div>
      <h1 style={{ fontSize: '2rem' }}>🏅 {t.workshopRankings}</h1>
      {event && <p style={{ opacity: 0.7, marginTop: -8 }}>{event.name}</p>}

      {workshops.length === 0 && <p>{t.noActivities}</p>}

      {workshops.map((w) => {
        const top = w.ranking.slice(0, 3);
        const ranks = computeRanks(w.ranking.map((r) => r.score)).slice(0, 3);
        return (
          <div key={w.workshop} className="card" style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.3rem', marginTop: 0 }}>{w.workshop}</h2>
            {top.every((entry) => entry.score === 0) ? (
              <p style={{ opacity: 0.6 }}>{t.noData}</p>
            ) : (
              top.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span>
                    <span style={{ marginRight: 10 }}>{rankBadge(ranks[i])}</span>
                    {entry.name}
                  </span>
                  <strong style={{ color: 'var(--primary)' }}>
                    {entry.score} {t.pts}
                  </strong>
                </div>
              ))
            )}
          </div>
        );
      })}

      <Link
        to={`/event/${id}`}
        className="festive-button"
        style={{ textDecoration: 'none', display: 'block' }}
      >
        {t.backToEvent}
      </Link>
    </div>
  );
};
