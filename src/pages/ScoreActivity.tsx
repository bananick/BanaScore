import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { ActivityDTO, EventDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { ScoringPanel } from '../components/ScoringPanel';

/** Focused, touch-friendly scoring of a single activity (one tablet per activity). */
export const ScoreActivity: React.FC = () => {
  const { eventId, activityId } = useParams();
  const toast = useToast();
  const aId = Number(activityId);
  const [activity, setActivity] = useState<ActivityDTO | null>(null);
  const [event, setEvent] = useState<EventDTO | null>(null);

  useEffect(() => {
    Promise.all([api.getActivities(eventId!), api.getEvent(eventId!)])
      .then(([ar, ev]) => {
        setActivity(ar.find((a) => a.id === aId) ?? null);
        setEvent(ev);
      })
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activityId]);

  const locked = !!event && event.status !== 'open';

  return (
    <div className="app-container">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link to={`/score/${eventId}`} style={{ color: 'white' }}>
          ← {t.backToActivities}
        </Link>
      </header>
      <h1 style={{ fontSize: '1.8rem' }}>{activity?.name ?? '…'}</h1>
      {locked && (
        <div
          className="card"
          style={{ borderColor: 'var(--accent)', background: 'rgba(230,126,34,0.12)', padding: 12 }}
        >
          🔒 {t.eventLocked}
        </div>
      )}
      <ScoringPanel eventId={eventId!} activityId={aId} locked={locked} />
    </div>
  );
};
