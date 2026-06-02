import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { RankingEntry } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';

export const Ranking: React.FC = () => {
  const { id, type, activityId } = useParams();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [title, setTitle] = useState('');

  const fetchRanking = async () => {
    if (type === 'votes') {
      setRanking(await api.rankingVotes(id!));
      setTitle(`🗳️ ${t.voteRanking}`);
    } else if (type === 'activity' && activityId) {
      const data = await api.rankingActivity(id!, activityId);
      setRanking(data.ranking);
      setTitle(`🎯 ${data.activityName}`);
    } else {
      setRanking(await api.rankingGlobal(id!));
      setTitle(`🏆 ${t.globalScore}`);
    }
  };

  usePolling(() => {
    fetchRanking().catch(() => undefined);
  }, 5000, [id, type, activityId]);

  return (
    <div className="app-container">
      <h1 style={{ fontSize: '2rem' }}>{title}</h1>
      <div className="card">
        {ranking.map((team, index) => (
          <div
            key={team.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 15,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: index === 0 ? '1.4rem' : '1.1rem',
              background: index === 0 ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
              borderRadius: index === 0 ? 10 : 0,
            }}
          >
            <span>
              <span style={{ opacity: 0.5, marginRight: 10 }}>#{index + 1}</span>
              {team.name} {index === 0 && '👑'}
            </span>
            <strong style={{ color: index === 0 ? 'var(--primary)' : 'inherit' }}>
              {team.score} {t.pts}
            </strong>
          </div>
        ))}
      </div>
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
