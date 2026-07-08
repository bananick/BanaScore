import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import * as api from '../api';
import type { ActivityScoring, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { Collapsible } from './Collapsible';

/** Fallback point ladder for preset mode when the activity has none set. */
const DEFAULT_PRESET = [600, 500, 400, 300, 200, 100, 0];

/** Coloured dot for common team-colour prefixes (purely decorative). */
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

/**
 * Scoring controls for one activity, shared by the admin page and the tablet
 * screen. Supports three modes: free number entry (e.g. Kahoot), preset point
 * buttons (tap a value), or criteria toggles. With many teams sharing a colour
 * prefix (e.g. "Rouge A"…), teams are grouped into collapsible colour sections.
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

  const setScore = async (teamId: number, value: number | null) => {
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

  const mode = scoring.activity.scoring_mode;
  const presetValues =
    scoring.activity.preset_points && scoring.activity.preset_points.length
      ? scoring.activity.preset_points
      : DEFAULT_PRESET;

  const teamCard = (team: TeamDTO) => {
    const total = pointsFor(team.id);
    return (
      <div key={team.id} className="card" style={{ textAlign: 'left', padding: 14, margin: '10px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ color: 'var(--primary)' }}>{team.name}</strong>
          <span style={{ color: total > 0 ? 'var(--success)' : 'inherit', fontWeight: 700 }}>
            {total} {t.pts}
          </span>
        </div>

        {mode === 'free' && (
          <input
            type="number"
            min={0}
            defaultValue={total || ''}
            placeholder={t.enterPoints}
            disabled={locked}
            onBlur={(e) => {
              const v = parseInt(e.target.value, 10) || 0;
              if (v !== total) setScore(team.id, v);
            }}
            style={{ margin: 0 }}
          />
        )}

        {mode === 'preset' && (
          <div className="preset-grid">
            {presetValues.map((v) => {
              const active = total === v && total > 0;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={locked}
                  className={`preset-btn ${active ? 'active' : ''}`}
                  onClick={() => setScore(team.id, active ? null : v)}
                >
                  {v}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'criteria' && (
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
  };

  // Group teams by the first word of their name (e.g. colour). Only group when
  // there are several distinct groups and enough teams to warrant it.
  const groupKey = (name: string) => name.trim().split(/\s+/)[0] || name;
  const distinct = new Set(teams.map((tm) => groupKey(tm.name)));

  if (distinct.size < 2 || teams.length <= 8) {
    return <div>{teams.map(teamCard)}</div>;
  }

  const groups: { key: string; teams: TeamDTO[] }[] = [];
  const byKey = new Map<string, TeamDTO[]>();
  for (const tm of teams) {
    const k = groupKey(tm.name);
    let g = byKey.get(k);
    if (!g) {
      g = [];
      byKey.set(k, g);
      groups.push({ key: k, teams: g });
    }
    g.push(tm);
  }

  const scoredCount = (grp: TeamDTO[]) => grp.filter((tm) => pointsFor(tm.id) > 0).length;

  return (
    <div>
      {groups.map((g) => {
        const dot = COLOR_DOT[g.key.toLowerCase()] ?? '';
        return (
          <Collapsible
            key={g.key}
            title={`${dot ? dot + ' ' : ''}${g.key} — ${scoredCount(g.teams)}/${g.teams.length}`}
          >
            {g.teams.map(teamCard)}
          </Collapsible>
        );
      })}
    </div>
  );
};
