import React, { useEffect, useState } from 'react';
import * as api from '../api';
import type { ActivityScoring, TeamDTO } from '../types';
import { useToast } from '../toast';
import { COURSE_MAX, coursePoints, coursePositionFromPoints } from '../ifp';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Notation de la course d'orientation : on saisit la position (1..24) de chaque
 * équipe, qui applique le barème dégressif (40 000 → ≈26 000). Ex æquo autorisé
 * (même position = mêmes points). Bloc 40 % du total mondial.
 */
export const IfpCoursePanel: React.FC<{
  eventId: string | number;
  activityId: number;
  locked?: boolean;
}> = ({ eventId, activityId, locked }) => {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [scoring, setScoring] = useState<ActivityScoring | null>(null);

  const load = () => api.getActivityScoring(activityId).then(setScoring).catch(() => undefined);
  useEffect(() => {
    api.getTeams(eventId).then(setTeams).catch(() => undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activityId]);

  const pointsFor = (teamId: number) => scoring?.scores.find((s) => s.team_id === teamId)?.points ?? 0;
  const maxPos = teams.length || 24;

  const setPosition = async (teamId: number, raw: string) => {
    if (locked) return;
    const trimmed = raw.trim();
    if (!trimmed) {
      try {
        await api.setScore(activityId, teamId, 0);
        await load();
      } catch (e) {
        toast.error(api.apiErrorMessage(e));
      }
      return;
    }
    const pos = parseInt(trimmed, 10);
    if (Number.isNaN(pos) || pos < 1 || pos > maxPos) {
      toast.error(`Position attendue entre 1 et ${maxPos}.`);
      return;
    }
    try {
      await api.setScore(activityId, teamId, coursePoints(pos));
      await load();
    } catch (e) {
      toast.error(api.apiErrorMessage(e));
    }
  };

  if (!scoring) return <p>…</p>;
  if (teams.length === 0) return <p style={{ color: 'var(--accent)' }}>Aucune équipe pour cet événement.</p>;

  const sorted = [...teams].sort((a, b) => {
    const ga = a.team_group ?? '';
    const gb = b.team_group ?? '';
    return ga.localeCompare(gb) || a.name.localeCompare(b.name);
  });
  const filled = teams.filter((t) => pointsFor(t.id) > 0).length;

  return (
    <div>
      <p style={{ opacity: 0.75, marginTop: 0, textAlign: 'left' }}>
        🧭 Saisir la position (1 → {maxPos}) de chaque équipe · 1re = {fmt(COURSE_MAX)} pts · ex æquo autorisé
        <br />
        <span style={{ color: filled === teams.length ? 'var(--success)' : 'var(--disabled)' }}>
          {filled}/{teams.length} positions saisies
        </span>
      </p>

      {sorted.map((team) => {
        const pts = pointsFor(team.id);
        const pos = coursePositionFromPoints(pts, maxPos);
        return (
          <div
            key={team.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: 12,
              margin: '8px 0',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {team.team_group && (
                <span style={{ opacity: 0.5, marginRight: 6, fontSize: '0.8rem' }}>{team.team_group}</span>
              )}
              {team.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ opacity: 0.7, fontSize: '0.85rem' }}>Position</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxPos}
                defaultValue={pos ?? ''}
                placeholder="—"
                disabled={locked}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const newPos = v ? parseInt(v, 10) : null;
                  if (newPos !== pos) setPosition(team.id, e.target.value);
                }}
                style={{ width: 80, margin: 0, textAlign: 'center' }}
              />
              <span
                style={{
                  minWidth: 84,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: pts > 0 ? 'var(--success)' : 'var(--disabled)',
                }}
              >
                {pts > 0 ? `${fmt(pts)} pts` : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
