import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import * as api from '../api';
import type { ActivityScoring, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';

/**
 * Scoring controls for one activity, shared by the admin page and the tablet
 * screen. Renders a free number input (e.g. Kahoot) or one toggle button per
 * criterion, depending on the activity's scoring mode.
 */
export const ScoringPanel: React.FC<{
  eventId: string | number;
  activityId: number;
  locked?: boolean;
}> = ({ eventId, activityId, locked }) => {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [scoring, setScoring] = useState<ActivityScoring | null>(null);

  const loadScoring = () => api.getActivityScoring(activityId).then(setScoring).catch(() => undefined);
  useEffect(() => {
    api.getTeams(eventId).then(setTeams).catch(() => undefined);
    loadScoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activityId]);

  const pointsFor = (teamId: number) =>
    scoring?.scores.find((s) => s.team_id === teamId)?.points ?? 0;
  const achieved = (teamId: number, critId: number) =>
    !!scoring?.teamCriteria.some((tc) => tc.team_id === teamId && tc.criterion_id === critId);

  const setFree = async (teamId: number, value: number) => {
    try {
      await api.setScore(activityId, teamId, value);
      await loadScoring();
    } catch (e) {
      toast.error(api.apiErrorMessage(e));
    }
  };
  const toggle = async (critId: number, teamId: number, next: boolean) => {
    try {
      await api.toggleCriterion(critId, teamId, next);
      await loadScoring();
    } catch (e) {
      toast.error(api.apiErrorMessage(e));
    }
  };

  if (!scoring) return <p>…</p>;
  if (teams.length === 0) return <p style={{ color: 'var(--accent)' }}>{t.noTeamsHint}</p>;
  const isFree = scoring.activity.scoring_mode === 'free';

  return (
    <div>
      {teams.map((team) => {
        const total = pointsFor(team.id);
        return (
          <div key={team.id} className="card" style={{ textAlign: 'left', padding: 14, margin: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: 'var(--primary)' }}>{team.name}</strong>
              <span style={{ color: total > 0 ? 'var(--success)' : 'inherit', fontWeight: 700 }}>
                {total} {t.pts}
              </span>
            </div>
            {isFree ? (
              <input
                type="number"
                min={0}
                defaultValue={total || ''}
                placeholder={t.enterPoints}
                disabled={locked}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  if (v !== total) setFree(team.id, v);
                }}
                style={{ margin: 0 }}
              />
            ) : (
              <div className="criteria-grid">
                {scoring.criteria.map((c) => {
                  const on = achieved(team.id, c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={locked}
                      className={`criterion-btn ${on ? 'active' : ''}`}
                      onClick={() => toggle(c.id, team.id, !on)}
                    >
                      {on && <CheckCircle size={15} />}
                      <span>{c.label}</span>
                      <span className="criterion-pts">+{c.points}</span>
                    </button>
                  );
                })}
                {scoring.criteria.length === 0 && <span style={{ opacity: 0.6 }}>{t.noCriteria}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
