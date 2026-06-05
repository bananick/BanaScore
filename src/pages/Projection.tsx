import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize } from 'lucide-react';
import * as api from '../api';
import type { EventDTO, RankingEntry } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';
import { computeRanks, rankBadge } from '../ranks';

/** Large, auto-refreshing scoreboard meant to be projected on a screen/TV. */
export const Projection: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  usePolling(
    () => {
      Promise.all([api.getEvent(id!), api.rankingGlobal(id!)])
        .then(([ev, r]) => {
          setEvent(ev);
          setRanking(r);
        })
        .catch(() => undefined);
    },
    5000,
    [id],
  );

  const goFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  const max = ranking[0]?.score || 1;
  const ranks = computeRanks(ranking.map((r) => r.score));
  const brandStyle = event?.brand_color
    ? ({ ['--primary']: event.brand_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="projection" style={brandStyle}>
      <Link to={`/event/${id}`} className="projection-back no-print" title={t.backToEvent} aria-label={t.backToEvent}>
        <ArrowLeft size={22} />
      </Link>
      <button onClick={goFullscreen} className="projection-fs no-print" title={t.fullscreen}>
        <Maximize size={22} />
      </button>
      <header className="projection-head">
        {event?.logo_url ? (
          <img src={event.logo_url} alt="" className="projection-logo" />
        ) : (
          <div className="projection-brand">🍌 BanaScore</div>
        )}
        <h1>{event?.name ?? '…'}</h1>
        <p>🏆 {t.globalScore}</p>
      </header>

      <div className="projection-list">
        {ranking.map((team, i) => (
          <div key={team.id} className={`projection-row ${ranks[i] === 1 ? 'leader' : ''}`}>
            <span className="projection-rank">{rankBadge(ranks[i])}</span>
            <span className="projection-name">{team.name}</span>
            <span className="projection-bar">
              <span className="projection-bar-fill" style={{ width: `${(team.score / max) * 100}%` }} />
            </span>
            <span className="projection-score">{team.score}</span>
          </div>
        ))}
        {ranking.length === 0 && <p style={{ textAlign: 'center', opacity: 0.6 }}>{t.noData}</p>}
      </div>
    </div>
  );
};
