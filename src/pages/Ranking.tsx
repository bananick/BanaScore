import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import type { RankingEntry } from '../types';
import { t } from '../i18n';
import { usePolling } from '../hooks';
import { computeRanks, hasRanking } from '../ranks';
import { BackButton } from '../components/BackButton';
import { RankIcon } from '../components/RankIcon';

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

  // From the admin event page, "back" returns there; participants go to the
  // public event view.
  const isAdmin = api.adminToken.isSet();
  const backTo = isAdmin ? `/admin/event/${id}` : `/event/${id}`;

  return (
    <div className="app-container">
      <div className="page-top">
        <BackButton to={backTo} label={isAdmin ? t.eventManagement : undefined} />
      </div>
      <h1 style={{ fontSize: '2rem' }}>{title}</h1>
      <div className="card">
        {(() => {
          const scores = ranking.map((r) => r.score);
          const ranks = computeRanks(scores);
          const ranked = hasRanking(scores);
          return ranking.map((team, index) => {
            const rank = ranks[index];
            const showTrophy = ranked && rank <= 3 && team.score > 0;
            const isLeader = ranked && rank === 1 && team.score > 0;
            return (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 15,
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: isLeader ? '1.4rem' : '1.1rem',
                  background: isLeader ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
                  borderRadius: isLeader ? 10 : 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}>
                    {showTrophy ? <RankIcon rank={rank} size={isLeader ? 26 : 22} /> : null}
                  </span>
                  {team.name}
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
        to={backTo}
        className="festive-button"
        style={{ textDecoration: 'none', display: 'block' }}
      >
        {isAdmin ? t.eventManagement : t.backToEvent}
      </Link>
    </div>
  );
};
