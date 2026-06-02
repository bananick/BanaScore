import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import type { EventDTO } from '../types';
import { t } from '../i18n';

export const Home: React.FC = () => {
  const [events, setEvents] = useState<EventDTO[]>([]);

  useEffect(() => {
    api.getEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <div className="app-container">
      <h1>🍌 BanaScore</h1>
      <p>{t.appTagline}</p>
      <div className="card">
        <h2>{t.openEvents}</h2>
        {events.length === 0 ? (
          <p>{t.noEvents}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {events.map((e) => (
              <li key={e.id} style={{ margin: '10px 0' }}>
                <Link
                  to={`/event/${e.id}`}
                  className="festive-button"
                  style={{ display: 'block', textDecoration: 'none' }}
                >
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <hr />
        <Link to="/admin" style={{ color: 'var(--accent)' }}>
          {t.adminDashboard}
        </Link>
      </div>
    </div>
  );
};
