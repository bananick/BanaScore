import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import * as api from '../api';
import type { ActivityDTO, ScoreDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';

/** Focused, touch-friendly scoring of a single activity (one tablet per activity). */
export const ScoreActivity: React.FC = () => {
  const { eventId, activityId } = useParams();
  const toast = useToast();
  const aId = Number(activityId);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [activity, setActivity] = useState<ActivityDTO | null>(null);
  const [scores, setScores] = useState<ScoreDTO[]>([]);

  const reloadScores = async () => setScores(await api.getScores(aId));

  useEffect(() => {
    Promise.all([api.getTeams(eventId!), api.getActivities(eventId!), api.getScores(aId)])
      .then(([tr, ar, sr]) => {
        setTeams(tr);
        setActivity(ar.find((a) => a.id === aId) ?? null);
        setScores(sr);
      })
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activityId]);

  const isTaken = (pt: number, teamId: number) =>
    scores.some((s) => s.points === pt && s.team_id !== teamId);
  const current = (teamId: number) => scores.find((s) => s.team_id === teamId)?.points ?? null;

  const setScore = async (teamId: number, points: number | null) => {
    try {
      await api.setScore(aId, teamId, points);
      await reloadScores();
      if (points !== null) toast.success(t.scoreSaved);
    } catch (err) {
      toast.error(api.apiErrorMessage(err));
    }
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link to={`/score/${eventId}`} style={{ color: 'white' }}>
          ← {t.backToActivities}
        </Link>
      </header>
      <h1 style={{ fontSize: '1.8rem' }}>
        {activity?.name ?? '…'}
        {activity && activity.coefficient !== 1 ? ` (×${activity.coefficient})` : ''}
      </h1>
      <p style={{ opacity: 0.7, marginTop: -6 }}>{t.distributePoints(teams.length)}</p>

      {teams.map((team) => {
        const currentScore = current(team.id);
        return (
          <div key={team.id} className="card" style={{ textAlign: 'left', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{team.name}</strong>
              {currentScore && (
                <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>
                  <CheckCircle size={14} /> {currentScore} {t.pts}
                </span>
              )}
            </div>
            <div className="score-grid score-grid--lg">
              {Array.from({ length: teams.length }, (_, i) => i + 1).map((pt) => (
                <button
                  key={pt}
                  className={`score-btn ${currentScore === pt ? 'active' : ''}`}
                  disabled={isTaken(pt, team.id)}
                  onClick={() => setScore(team.id, pt)}
                >
                  {pt}
                </button>
              ))}
              {currentScore && (
                <button className="clear-btn" onClick={() => setScore(team.id, null)} title="Effacer">
                  <XCircle size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {teams.length === 0 && <p>{t.noData}</p>}
    </div>
  );
};
