import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Trash2, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from '../api';
import type { ActivityDTO, EventDTO, EventStats, EventStatus, ScoreDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { usePolling } from '../hooks';
import { Collapsible } from '../components/Collapsible';

function parseWeights(json: string | null): Record<string, number> {
  if (!json) return {};
  try {
    const o = JSON.parse(json);
    return o && typeof o === 'object' ? (o as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export const AdminEventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [event, setEvent] = useState<EventDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [teamScores, setTeamScores] = useState<ScoreDTO[]>([]);
  const [teamName, setTeamName] = useState('');
  const [activityName, setActivityName] = useState('');
  const [activityWorkshop, setActivityWorkshop] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [sessions, setSessions] = useState({ count: 5, prefix: '' });

  // Live dashboard polling — independent of the edit form so it never clobbers
  // unsaved changes in the meta/teams inputs.
  usePolling(
    () => {
      api.getStats(id!).then(setStats).catch(() => undefined);
    },
    5000,
    [id],
  );

  // Editable event meta.
  const [meta, setMeta] = useState({
    name: '',
    date: '',
    location: '',
    status: 'open' as EventStatus,
    maxVotes: 3,
    votingEnabled: true,
    rankingMode: 'raw' as 'raw' | 'normalized',
    workshopWeights: {} as Record<string, number>,
    brandColor: '',
    logoUrl: '',
    scorerCode: '',
  });

  const refresh = async () => {
    const [ev, tr, ar] = await Promise.all([
      api.getEvent(id!),
      api.getTeams(id!),
      api.getActivities(id!),
    ]);
    setEvent(ev);
    setMeta({
      name: ev.name,
      date: ev.date ?? '',
      location: ev.location ?? '',
      status: ev.status,
      maxVotes: ev.max_votes,
      votingEnabled: !!ev.voting_enabled,
      rankingMode: ev.ranking_mode === 'normalized' ? 'normalized' : 'raw',
      workshopWeights: parseWeights(ev.workshop_weights),
      brandColor: ev.brand_color ?? '',
      logoUrl: ev.logo_url ?? '',
      scorerCode: ev.scorer_code ?? '',
    });
    setTeams(tr);
    setActivities(ar);
    if (selectedActivity) {
      setTeamScores(await api.getScores(selectedActivity));
    }
  };

  useEffect(() => {
    refresh().catch((err) => toast.error(api.apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selectedActivity]);

  const guard =
    <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
    async (...args: A) => {
      try {
        await fn(...args);
      } catch (err) {
        toast.error(api.apiErrorMessage(err));
      }
    };

  const saveMeta = guard(async () => {
    if (!meta.name.trim()) return;
    await api.updateEvent(Number(id), {
      name: meta.name.trim(),
      date: meta.date || null,
      location: meta.location || null,
      status: meta.status,
      maxVotes: meta.maxVotes,
      votingEnabled: meta.votingEnabled,
      rankingMode: meta.rankingMode,
      workshopWeights: meta.rankingMode === 'normalized' ? meta.workshopWeights : null,
      brandColor: meta.brandColor || null,
      logoUrl: meta.logoUrl || null,
      scorerCode: meta.scorerCode.trim() || null,
    });
    await refresh();
    toast.success(t.saved);
  });

  const addTeam = guard(async () => {
    if (!teamName.trim()) return;
    await api.createTeam(id!, teamName.trim());
    setTeamName('');
    await refresh();
  });

  const addActivity = guard(async () => {
    if (!activityName.trim()) return;
    await api.createActivity(id!, activityName.trim(), activityWorkshop.trim() || undefined);
    setActivityName('');
    setActivityWorkshop('');
    await refresh();
  });

  const setWorkshop = guard(async (activityId: number, workshop: string) => {
    await api.updateActivity(activityId, { workshop: workshop || null });
    await refresh();
  });

  const renameTeam = guard(async (teamId: number, name: string) => {
    await api.updateTeam(id!, teamId, { name });
    await refresh();
  });

  const setBonus = guard(async (teamId: number, adminPoints: number) => {
    await api.updateTeam(id!, teamId, { adminPoints });
    await refresh();
  });

  const setBonusLabel = guard(async (teamId: number, bonusLabel: string) => {
    await api.updateTeam(id!, teamId, { bonusLabel: bonusLabel || null });
    await refresh();
  });

  const renameActivity = guard(async (activityId: number, name: string) => {
    await api.updateActivity(activityId, { name });
    await refresh();
  });

  const setCoefficient = guard(async (activityId: number, coefficient: number) => {
    await api.updateActivity(activityId, { coefficient });
    await refresh();
  });

  const deleteTeam = (team: TeamDTO) =>
    guard(async () => {
      if (!window.confirm(t.deleteTeamConfirm(team.name))) return;
      await api.deleteTeam(id!, team.id);
      await refresh();
    })();

  const deleteActivity = (activity: ActivityDTO) =>
    guard(async () => {
      if (!window.confirm(t.deleteActivityConfirm(activity.name))) return;
      await api.deleteActivity(activity.id);
      if (selectedActivity === activity.id) setSelectedActivity(null);
      await refresh();
    })();

  const deleteEvent = guard(async () => {
    if (!event || !window.confirm(t.deleteEventConfirm(event.name))) return;
    await api.deleteEvent(event.id);
    navigate('/admin');
  });

  const makeSessions = guard(async () => {
    const prefix = (sessions.prefix.trim() || event?.name || 'Session').replace(/\s*—\s*mod.le$/i, '');
    const res = await api.generateSessions(Number(id), sessions.count, prefix);
    toast.success(t.sessionsCreated(res.ids.length));
  });

  const updateScore = (teamId: number, points: number | null) =>
    guard(async () => {
      if (!selectedActivity) return;
      await api.setScore(selectedActivity, teamId, points);
      setTeamScores(await api.getScores(selectedActivity));
    })();

  const isPointTaken = (pt: number, currentTeamId: number) =>
    teamScores.some((s) => s.points === pt && s.team_id !== currentTeamId);
  const getTeamScore = (teamId: number) =>
    teamScores.find((s) => s.team_id === teamId)?.points ?? null;

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/admin" style={{ color: 'white' }}>
          ← {t.adminTitle}
        </Link>
        <h1 style={{ fontSize: '2rem' }}>{t.eventManagement}</h1>
      </header>

      {/* Live dashboard */}
      {stats && (
        <div className="card">
          <h3>📡 {t.liveDashboard}</h3>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-value">{stats.teams}</span>
              <span className="stat-label">{t.teamsCount}</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.participants}</span>
              <span className="stat-label">{t.participants}</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.votes}</span>
              <span className="stat-label">{t.votesCol}</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {stats.activitiesScored}/{stats.activitiesTotal}
              </span>
              <span className="stat-label">{t.activitiesScored}</span>
            </div>
          </div>
        </div>
      )}

      {/* Event meta */}
      <Collapsible title={`⚙️ ${t.eventSettings}`}>
        <input
          value={meta.name}
          onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          placeholder={t.eventName}
        />
        <input
          value={meta.date}
          onChange={(e) => setMeta({ ...meta, date: e.target.value })}
          placeholder={t.eventDate}
        />
        <input
          value={meta.location}
          onChange={(e) => setMeta({ ...meta, location: e.target.value })}
          placeholder={t.eventLocation}
        />
        <label style={{ display: 'block', textAlign: 'left', margin: '8px 0', opacity: 0.8 }}>
          {t.status}
        </label>
        <select
          value={meta.status}
          onChange={(e) => setMeta({ ...meta, status: e.target.value as EventStatus })}
          style={selectStyle}
        >
          <option value="open">{t.statusOpen}</option>
          <option value="closed">{t.statusClosed}</option>
          <option value="archived">{t.statusArchived}</option>
        </select>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', textAlign: 'left', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={meta.votingEnabled}
            onChange={(e) => setMeta({ ...meta, votingEnabled: e.target.checked })}
            style={{ width: 18, height: 18, margin: 0 }}
          />
          {t.votingEnabled}
        </label>
        {meta.votingEnabled && (
          <>
            <label style={{ display: 'block', textAlign: 'left', margin: '8px 0', opacity: 0.8 }}>
              {t.maxVotes}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={meta.maxVotes}
              onChange={(e) => setMeta({ ...meta, maxVotes: parseInt(e.target.value, 10) || 1 })}
            />
          </>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', opacity: 0.8 }}>
          {t.brandColor}
          <input
            type="color"
            value={meta.brandColor || '#f1c40f'}
            onChange={(e) => setMeta({ ...meta, brandColor: e.target.value })}
            style={{ width: 48, height: 34, padding: 0, margin: 0, cursor: 'pointer' }}
          />
          {meta.brandColor && (
            <button
              type="button"
              className="icon-btn"
              title={t.reset}
              onClick={() => setMeta({ ...meta, brandColor: '' })}
            >
              <XCircle size={16} />
            </button>
          )}
        </label>

        <label style={{ display: 'block', textAlign: 'left', margin: '8px 0', opacity: 0.8 }}>
          {t.rankingMode}
        </label>
        <select
          value={meta.rankingMode}
          onChange={(e) => setMeta({ ...meta, rankingMode: e.target.value as 'raw' | 'normalized' })}
          style={selectStyle}
        >
          <option value="raw">{t.rankingRaw}</option>
          <option value="normalized">{t.rankingNormalized}</option>
        </select>
        {meta.rankingMode === 'normalized' && (
          <div style={{ textAlign: 'left', margin: '10px 0', padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0 0 8px' }}>{t.weightsHint}</p>
            {[...new Set(activities.map((a) => (a.workshop?.trim() || a.name)))].map((ws) => (
              <label key={ws} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '4px 0' }}>
                <span>{ws}</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={meta.workshopWeights[ws] ?? 1}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      workshopWeights: { ...meta.workshopWeights, [ws]: parseFloat(e.target.value) || 1 },
                    })
                  }
                  style={{ width: 80, margin: 0 }}
                />
              </label>
            ))}
            {activities.length === 0 && <p style={{ opacity: 0.6, margin: 0 }}>{t.noActivitiesYet}</p>}
          </div>
        )}

        <input
          value={meta.logoUrl}
          onChange={(e) => setMeta({ ...meta, logoUrl: e.target.value })}
          placeholder={t.logoUrl}
        />

        <input
          value={meta.scorerCode}
          onChange={(e) => setMeta({ ...meta, scorerCode: e.target.value })}
          placeholder={t.scorerCode}
        />
        <p style={{ textAlign: 'left', fontSize: '0.78rem', opacity: 0.6, margin: '4px 0 0' }}>
          {t.scorerCodeHint}
        </p>

        <button onClick={saveMeta} className="festive-button">
          {t.save}
        </button>
      </Collapsible>

      <Collapsible title={`🗂️ ${t.generateSessions}`}>
        <label style={{ display: 'block', textAlign: 'left', margin: '4px 0', opacity: 0.8 }}>
          {t.sessionsCount}
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={sessions.count}
          onChange={(e) => setSessions({ ...sessions, count: parseInt(e.target.value, 10) || 1 })}
        />
        <input
          value={sessions.prefix}
          onChange={(e) => setSessions({ ...sessions, prefix: e.target.value })}
          placeholder={t.sessionsPrefix}
        />
        <button onClick={makeSessions} className="festive-button">
          {t.generate}
        </button>
      </Collapsible>

      <Collapsible title={t.addTeam}>
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t.teamName} />
        <button onClick={addTeam} className="festive-button">
          {t.addTeam}
        </button>
      </Collapsible>

      <Collapsible title={t.addActivity}>
        <input
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          placeholder={t.activityName}
        />
        <input
          value={activityWorkshop}
          onChange={(e) => setActivityWorkshop(e.target.value)}
          placeholder={t.workshopOptional}
        />
        <button onClick={addActivity} className="festive-button">
          {t.addActivity}
        </button>
        {activities.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {activities.map((a) => (
              <div
                key={a.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}
              >
                <input
                  defaultValue={a.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== a.name) renameActivity(a.id, v);
                  }}
                  style={{ margin: 0, flex: 1, minWidth: 90 }}
                />
                <input
                  defaultValue={a.workshop ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (a.workshop ?? '')) setWorkshop(a.id, v);
                  }}
                  placeholder={t.workshop}
                  title={t.workshop}
                  style={{ margin: 0, flex: 1, minWidth: 90 }}
                />
                <label
                  title={t.coefficient}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.85, fontSize: '0.9rem' }}
                >
                  ×
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.5}
                    defaultValue={a.coefficient}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (v > 0 && v !== a.coefficient) setCoefficient(a.id, v);
                    }}
                    style={{ width: 64, margin: 0 }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => deleteActivity(a)}
                  className="icon-btn icon-btn--danger"
                  title={t.deleteEvent}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      <Collapsible title={`🎯 ${t.scoringMode}`}>
        <select
          onChange={(e) => setSelectedActivity(parseInt(e.target.value) || null)}
          value={selectedActivity ?? ''}
          style={{ ...selectStyle, marginBottom: 20 }}
        >
          <option value="">{t.selectActivity}</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {teams.length === 0 ? (
          <p style={{ color: 'var(--accent)' }}>{t.noTeamsHint}</p>
        ) : selectedActivity ? (
          <div>
            <h4>{t.distributePoints(teams.length)}</h4>
            {teams.map((team) => {
              const currentScore = getTeamScore(team.id);
              return (
                <div key={team.id} style={scoreRowStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong style={{ color: 'var(--primary)' }}>{team.name}</strong>
                    {currentScore && (
                      <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
                        <CheckCircle size={14} /> {t.assigned}: {currentScore} {t.pts}
                      </span>
                    )}
                  </div>
                  <div className="score-grid">
                    {Array.from({ length: teams.length }, (_, i) => i + 1).map((pt) => (
                      <button
                        key={pt}
                        className={`score-btn ${currentScore === pt ? 'active' : ''}`}
                        disabled={isPointTaken(pt, team.id)}
                        onClick={() => updateScore(team.id, pt)}
                      >
                        {pt}
                      </button>
                    ))}
                    {currentScore && (
                      <button className="clear-btn" onClick={() => updateScore(team.id, null)} title="Effacer">
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>{t.selectActivityHint}</p>
        )}
      </Collapsible>

      <Collapsible title={`🏷️ ${t.teamsQr}`}>
      {teams.map((team) => (
        <div key={team.id} className="card">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}
          >
            <input
              defaultValue={team.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== team.name) renameTeam(team.id, v);
              }}
              style={{ margin: 0, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => deleteTeam(team)}
              className="icon-btn icon-btn--danger"
              title={t.deleteEvent}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.85rem', opacity: 0.85 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.bonus}
              <input
                type="number"
                defaultValue={team.admin_points}
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  if (v !== team.admin_points) setBonus(team.id, v);
                }}
                style={{ width: 80, margin: 0 }}
              />
            </label>
            <input
              defaultValue={team.bonus_label ?? ''}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (team.bonus_label ?? '')) setBonusLabel(team.id, v);
              }}
              placeholder={t.bonusLabel}
              style={{ flex: 1, minWidth: 120, margin: 0 }}
            />
          </div>
          <div
            style={{
              background: 'white',
              padding: 15,
              display: 'inline-block',
              borderRadius: 15,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              marginTop: 10,
            }}
          >
            <QRCodeSVG value={`${window.location.origin}/register/${team.qr_token}`} size={160} />
          </div>
        </div>
      ))}
      {teams.length === 0 && <p style={{ opacity: 0.6 }}>{t.noTeamsHint}</p>}
      </Collapsible>

      <Collapsible title={`🏆 ${t.linksTools}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link to={`/score/${id}`} className="festive-button" style={{ textDecoration: 'none' }}>
          ✍️ {t.scoreTablet}
        </Link>
        <Link
          to={`/event/${id}/workshops`}
          className="festive-button"
          style={{ textDecoration: 'none', background: 'var(--blue)' }}
        >
          🏅 {t.workshopRankings}
        </Link>
        <Link to={`/event/${id}/ranking/global`} className="festive-button" style={{ textDecoration: 'none' }}>
          🏆 {t.globalRanking}
        </Link>
        <Link
          to={`/event/${id}/ranking/votes`}
          className="festive-button"
          style={{ textDecoration: 'none', background: 'var(--accent)' }}
        >
          🗳️ {t.votesOnly}
        </Link>
        <Link
          to={`/event/${id}/board`}
          className="festive-button"
          style={{ textDecoration: 'none', background: 'var(--blue)' }}
        >
          📺 {t.projection}
        </Link>
        <Link
          to={`/admin/event/${id}/report`}
          className="festive-button"
          style={{ textDecoration: 'none', background: 'var(--success)' }}
        >
          📄 {t.report}
        </Link>
        <Link
          to={`/admin/event/${id}/posters`}
          className="festive-button"
          style={{ textDecoration: 'none', background: 'var(--secondary)', color: 'white' }}
        >
          🖨️ {t.posters}
        </Link>
      </div>
      </Collapsible>

      <Collapsible title={`⚠️ ${t.dangerZone}`} danger>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 12px' }}>
          {t.deleteEventDesc}
        </p>
        <button
          type="button"
          onClick={deleteEvent}
          className="festive-button"
          style={{ background: 'var(--error)', color: 'white', boxShadow: 'none' }}
        >
          <Trash2 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          {t.deleteEvent}
        </button>
      </Collapsible>
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  width: '100%',
  background: '#333',
  color: 'white',
  border: '1px solid var(--primary)',
};

const scoreRowStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  padding: 15,
  borderRadius: 15,
  margin: '10px 0',
  textAlign: 'left',
};
