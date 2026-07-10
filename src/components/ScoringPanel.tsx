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

const byName = (a: TeamDTO, b: TeamDTO) => a.name.localeCompare(b.name);
const letterOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

/**
 * Scoring controls for one activity, shared by the admin page and the tablet
 * screen. Modes: free number entry, preset point buttons (tap a value), or
 * criteria toggles. Teams sharing a colour prefix ("Rouge A"…) are grouped into
 * collapsible colour sections. In preset mode each colour is split into
 * half-groups (one per ladder length) separated visually, and a point value
 * already given inside a half-group is locked out for the others (unique
 * distribution, e.g. only one team can hold 600).
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

  // `disabled`: positive values already taken by OTHER teams of the same
  // half-group (unique distribution). The team keeps its own value tappable.
  const teamCard = (team: TeamDTO, disabled?: Set<number>) => {
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
              const taken = !active && v > 0 && !!disabled?.has(v);
              return (
                <button
                  key={v}
                  type="button"
                  disabled={locked || taken}
                  title={taken ? t.presetTaken : undefined}
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

  // Render a list of teams. In preset mode, split into half-groups (size = ladder
  // length) with a visual separator, and enforce unique point distribution
  // within each half-group.
  const renderTeams = (list: TeamDTO[], split: boolean) => {
    if (mode !== 'preset' || presetValues.length === 0) return list.map((tm) => teamCard(tm));
    // Split a colour into two equal half-groups (e.g. A–H / I–P). Uniqueness of
    // point values applies inside each half-group independently.
    const mid = Math.ceil(list.length / 2);
    const half = split && list.length > 1 ? [list.slice(0, mid), list.slice(mid)] : [list];
    return half.map((grp, ci) => {
      const takenByOthers = (teamId: number) => {
        const s = new Set<number>();
        for (const tm of grp) {
          if (tm.id === teamId) continue;
          const p = pointsFor(tm.id);
          if (p > 0) s.add(p);
        }
        return s;
      };
      const first = letterOf(grp[0].name);
      const last = letterOf(grp[grp.length - 1].name);
      const label = first && last ? (first === last ? first : `${first}–${last}`) : `Groupe ${ci + 1}`;
      return (
        <div key={ci}>
          {half.length > 1 && <div className="subgroup-sep">{label}</div>}
          {grp.map((tm) => teamCard(tm, takenByOthers(tm.id)))}
        </div>
      );
    });
  };

  // Group teams by the first word of their name (e.g. colour). Only group when
  // there are several distinct groups and enough teams to warrant it.
  const groupKey = (name: string) => name.trim().split(/\s+/)[0] || name;
  const distinct = new Set(teams.map((tm) => groupKey(tm.name)));

  if (distinct.size < 2 || teams.length <= 8) {
    return <div>{renderTeams([...teams].sort(byName), false)}</div>;
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
        const sorted = [...g.teams].sort(byName);
        const dot = COLOR_DOT[g.key.toLowerCase()] ?? '';
        return (
          <Collapsible
            key={g.key}
            title={`${dot ? dot + ' ' : ''}${g.key} — ${scoredCount(g.teams)}/${g.teams.length}`}
          >
            {renderTeams(sorted, true)}
          </Collapsible>
        );
      })}
    </div>
  );
};
