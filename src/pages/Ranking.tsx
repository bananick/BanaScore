import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { RankingEntry } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';
import { computeRanks, rankBadge } from '../ranks';

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
        {(() => {
          const ranks = computeRanks(ranking.map((r) => r.score));
          return ranking.map((team, index) => {
            const rank = ranks[index];
            const isLeader = rank === 1;
            return (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: 15,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: isLeader ? '1.4rem' : '1.1rem',
                  background: isLeader ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
                  borderRadius: isLeader ? 10 : 0,
                }}
              >
                <span>
                  <span style={{ opacity: 0.6, marginRight: 10 }}>{rankBadge(rank)}</span>
                  {team.name} {isLeader && '👑'}
                </span>
                <strong style={{ color: isLeader ? 'var(--primary)' : 'inherit' }}>
                  {team.score} {t.pts}
                </strong>
              </div>
            );
          });
        })()}
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
