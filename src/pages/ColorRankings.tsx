import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../api';
import type { EventDTO, RankingEntry } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';
import { computeRanks } from '../ranks';
import { BackButton } from '../components/BackButton';
import { RankIcon } from '../components/RankIcon';

const COLOR_DOT: Record<string, string> = {
  rouge: '🔴',
  bleu: '🔵',
  bleue: '🔵',
  vert: '🟢',
  verte: '🟢',
  jaune: '🟡',
  orange: '🟠',
  violet: '🟣',
  rose: '🩷',
  noir: '⚫',
  blanc: '⚪',
};
// Preferred display order for known colours (others follow, alphabetically).
const COLOR_ORDER = ['rouge', 'bleu', 'vert', 'jaune', 'orange', 'violet', 'rose', 'noir', 'blanc'];
const colorRank = (c: string) => {
  const i = COLOR_ORDER.indexOf(c.toLowerCase());
  return i === -1 ? COLOR_ORDER.length : i;
};

/**
 * One ranking per team colour: within each colour (Rouge, Bleu…) its teams are
 * ranked by total points. Colour = first word of the team name. Auto-refreshing.
 */
export const ColorRankings: React.FC = () => {
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

  const isAdmin = api.adminToken.isSet();
  const backTo = isAdmin ? `/admin/event/${id}` : `/event/${id}`;

  // Group teams by colour (global ranking is already sorted by score desc, so
  // each colour's teams keep descending order).
  const groups: { color: string; teams: RankingEntry[] }[] = [];
  const byColor = new Map<string, RankingEntry[]>();
  for (const team of ranking) {
    const color = team.name.trim().split(/\s+/)[0] || team.name;
    let g = byColor.get(color);
    if (!g) {
      g = [];
      byColor.set(color, g);
      groups.push({ color, teams: g });
    }
    g.push(team);
  }
  groups.sort((a, b) => colorRank(a.color) - colorRank(b.color) || a.color.localeCompare(b.color));

  const brandStyle = event?.brand_color
    ? ({ ['--primary']: event.brand_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="app-container" style={brandStyle}>
      <div className="page-top">
        <BackButton to={backTo} label={isAdmin ? t.eventManagement : undefined} />
      </div>
      <h1 style={{ fontSize: '2rem' }}>🎨 {t.colorRanking}</h1>
      {event && <p style={{ opacity: 0.7, marginTop: -8 }}>{event.name}</p>}

      {groups.length === 0 && <p>{t.noData}</p>}

      {groups.map((g) => {
        const ranks = computeRanks(g.teams.map((tm) => tm.score));
        const dot = COLOR_DOT[g.color.toLowerCase()] ?? '';
        return (
          <div key={g.color} className="card" style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.3rem', marginTop: 0 }}>
              {dot} {g.color}
            </h2>
            {g.teams.map((tm, i) => {
              const rank = ranks[i];
              const showTrophy = rank <= 3 && tm.score > 0;
              const isLeader = rank === 1 && tm.score > 0;
              return (
                <div
                  key={tm.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: isLeader ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
                    borderRadius: isLeader ? 8 : 0,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 30,
                        display: 'inline-flex',
                        justifyContent: 'center',
                        opacity: 0.85,
                        fontWeight: 700,
                      }}
                    >
                      {showTrophy ? <RankIcon rank={rank} size={20} /> : `${rank}.`}
                    </span>
                    {tm.name}
                  </span>
                  <strong style={{ color: isLeader ? 'var(--primary)' : 'inherit' }}>
                    {tm.score} {t.pts}
                  </strong>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
