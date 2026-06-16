import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { ActivityDTO, EventDTO } from '../types';
import { t } from '../i18n';
import { BackButton } from '../components/BackButton';

/** Tablet entry point: pick the activity this tablet will score. */
export const ScoreHome: React.FC = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [activities, setActivities] = useState<ActivityDTO[]>([]);

  useEffect(() => {
    Promise.all([api.getEvent(eventId!), api.getActivities(eventId!)])
      .then(([e, a]) => {
        setEvent(e);
        setActivities(a);
      })
      .catch(() => undefined);
  }, [eventId]);

  // Group activities by atelier for clarity (fallback: activity name).
  const groups = new Map<string, ActivityDTO[]>();
  for (const a of activities) {
    const key = a.workshop?.trim() || a.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  // Reached from the admin event page (the logical "previous" page) when admin;
  // animateurs arriving via a tablet QR fall back to home.
  const isAdmin = api.adminToken.isSet();
  const backTo = isAdmin ? `/admin/event/${eventId}` : '/';
  const backLabel = isAdmin ? t.eventManagement : t.home;

  return (
    <div className="app-container">
      <div className="page-top">
        <BackButton to={backTo} label={backLabel} />
      </div>
      <h1 style={{ fontSize: '2rem' }}>✍️ {t.scoringFor}</h1>
      {event && <p style={{ opacity: 0.7, marginTop: -8 }}>{event.name}</p>}
      <div className="card">
        <h2>{t.chooseActivity}</h2>
        {activities.length === 0 && <p>{t.noData}</p>}
        {[...groups.entries()].map(([workshop, items]) => (
          <div key={workshop} style={{ marginBottom: 16, textAlign: 'left' }}>
            <h3 style={{ fontSize: '1rem', opacity: 0.8, margin: '8px 0' }}>{workshop}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((a) => (
                <Link
                  key={a.id}
                  to={`/score/${eventId}/a/${a.id}`}
                  className="festive-button"
                  style={{ textDecoration: 'none' }}
                >
                  {a.name}
                  {a.coefficient !== 1 ? ` (×${a.coefficient})` : ''}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
