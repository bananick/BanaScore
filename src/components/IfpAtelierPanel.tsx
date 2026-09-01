import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import * as api from '../api';
import type { ActivityScoring, TeamDTO } from '../types';
import { useToast } from '../toast';
import {
  BAREME,
  FUNFLASHER_MAX,
  FUNFLASHER_MIN,
  HORAIRES,
  currentRotationIndex,
  rankFromPoints,
  type Atelier,
} from '../ifp';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Notation d'un atelier IFP : 6 rotations, 4 équipes chacune. L'animateur
 * attribue un rang (1..4 strict, ou 1,1,2,2 pour billes/laser) qui applique le
 * barème, ou saisit un score brut (FunFlasher, 7500–10000). Ne montre que les
 * équipes de chaque rotation pour un choix simple et sans erreur.
 */
export const IfpAtelierPanel: React.FC<{
  eventId: string | number;
  activityId: number;
  atelier: Atelier;
  locked?: boolean;
}> = ({ eventId, activityId, atelier, locked }) => {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [scoring, setScoring] = useState<ActivityScoring | null>(null);
  const nowRotation = currentRotationIndex();

  const load = () => api.getActivityScoring(activityId).then(setScoring).catch(() => undefined);
  useEffect(() => {
    api.getTeams(eventId).then(setTeams).catch(() => undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, activityId]);

  const isDuo = atelier.kind === 'rank-duo';
  const isFunflasher = atelier.kind === 'funflasher';
  const ranks = isDuo ? [1, 2] : [1, 2, 3, 4];

  const pointsFor = (teamId: number) => scoring?.scores.find((s) => s.team_id === teamId)?.points ?? 0;
  const rankOf = (teamId: number) => rankFromPoints(pointsFor(teamId));
  const teamsInGroup = (letter: string) =>
    teams
      .filter((t) => (t.team_group ?? '') === letter)
      .sort((a, b) => a.name.localeCompare(b.name));

  const save = async (teamId: number, points: number) => {
    try {
      await api.setScore(activityId, teamId, points);
      await load();
    } catch (e) {
      toast.error(api.apiErrorMessage(e));
    }
  };

  const tapRank = async (letter: string, teamId: number, rank: number) => {
    if (locked) return;
    if (rankOf(teamId) === rank) {
      await save(teamId, 0); // re-tap clears
      return;
    }
    const pts = BAREME[rank - 1];
    const mates = teamsInGroup(letter).filter((t) => t.id !== teamId);
    if (isDuo) {
      const already = mates.filter((t) => rankOf(t.id) === rank).length;
      if (already >= 2) {
        toast.info('Déjà 2 équipes à cette place.');
        return;
      }
      await save(teamId, pts);
    } else {
      // Rang unique : on libère l'équipe qui détenait ce rang.
      const holder = mates.find((t) => rankOf(t.id) === rank);
      if (holder) await api.setScore(activityId, holder.id, 0);
      await save(teamId, pts);
    }
  };

  const setFunflasher = async (teamId: number, raw: string) => {
    if (locked) return;
    const trimmed = raw.trim();
    if (!trimmed) {
      await save(teamId, 0);
      return;
    }
    const v = parseInt(trimmed, 10);
    if (Number.isNaN(v)) return;
    if (v < FUNFLASHER_MIN || v > FUNFLASHER_MAX) {
      toast.error(`Score FunFlasher attendu entre ${fmt(FUNFLASHER_MIN)} et ${fmt(FUNFLASHER_MAX)}.`);
      return;
    }
    await save(teamId, v);
  };

  const rotationComplete = (letter: string): boolean => {
    const grp = teamsInGroup(letter);
    if (grp.length !== 4) return false;
    if (isFunflasher) {
      return grp.every((t) => {
        const p = pointsFor(t.id);
        return p >= FUNFLASHER_MIN && p <= FUNFLASHER_MAX;
      });
    }
    const rks = grp.map((t) => rankOf(t.id));
    if (rks.some((r) => r === 0)) return false;
    if (isDuo) {
      return rks.filter((r) => r === 1).length === 2 && rks.filter((r) => r === 2).length === 2;
    }
    return [1, 2, 3, 4].every((r) => rks.filter((x) => x === r).length === 1);
  };

  if (!scoring) return <p>…</p>;
  if (teams.length === 0) return <p style={{ color: 'var(--accent)' }}>Aucune équipe pour cet événement.</p>;

  return (
    <div>
      <p style={{ opacity: 0.75, marginTop: 0, textAlign: 'left' }}>
        👤 {atelier.staff}
        {isFunflasher
          ? ` · score saisi ${fmt(FUNFLASHER_MIN)}–${fmt(FUNFLASHER_MAX)}`
          : isDuo
            ? ' · classement à égalités (2×1er, 2×2e)'
            : ' · classement 1 → 4'}
      </p>

      {atelier.rotations.map((letter, r) => {
        const grp = teamsInGroup(letter);
        const complete = rotationComplete(letter);
        const isNow = r === nowRotation;
        return (
          <div
            key={r}
            className="card"
            style={{
              textAlign: 'left',
              padding: 14,
              margin: '12px 0',
              borderColor: isNow ? 'var(--primary)' : undefined,
              boxShadow: isNow ? '0 0 0 2px var(--primary) inset' : undefined,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                gap: 8,
              }}
            >
              <strong style={{ fontSize: '1.05rem' }}>
                R{r + 1} · {HORAIRES[r]} · Groupe {letter}
                {isNow && (
                  <span style={{ color: 'var(--primary)', marginLeft: 8, fontSize: '0.8rem' }}>● en cours</span>
                )}
              </strong>
              <span
                title={complete ? 'Rotation complète' : 'À compléter'}
                style={{ color: complete ? 'var(--success)' : 'var(--disabled)', flexShrink: 0 }}
              >
                {complete ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              </span>
            </div>

            {grp.map((team) => {
              const pts = pointsFor(team.id);
              const selRank = rankOf(team.id);
              return (
                <div
                  key={team.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ minWidth: 120, fontWeight: 600 }}>{team.name}</span>
                  {isFunflasher ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={FUNFLASHER_MIN}
                        max={FUNFLASHER_MAX}
                        defaultValue={pts || ''}
                        placeholder={`${FUNFLASHER_MIN}–${FUNFLASHER_MAX}`}
                        disabled={locked}
                        onBlur={(e) => {
                          if ((parseInt(e.target.value, 10) || 0) !== pts) setFunflasher(team.id, e.target.value);
                        }}
                        style={{ width: 130, margin: 0 }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {ranks.map((rank) => (
                        <button
                          key={rank}
                          type="button"
                          disabled={locked}
                          className={`score-btn ${selRank === rank ? 'active' : ''}`}
                          style={{ width: 46, height: 46, fontSize: '1.1rem' }}
                          onClick={() => tapRank(letter, team.id, rank)}
                          title={`${rank}${rank === 1 ? 'er' : 'e'} · ${fmt(BAREME[rank - 1])} pts`}
                        >
                          {rank}
                        </button>
                      ))}
                    </div>
                  )}
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
              );
            })}
            {grp.length !== 4 && (
              <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>
                ⚠ Groupe {letter} incomplet ({grp.length}/4 équipes). Vérifiez la configuration.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
