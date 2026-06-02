import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Trash2, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as api from '../api';
import type { ActivityDTO, EventDTO, EventStatus, ScoreDTO, TeamDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';

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
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);

  // Editable event meta.
  const [meta, setMeta] = useState({ name: '', date: '', location: '', status: 'open' as EventStatus });

  const refresh = async () => {
    const [ev, tr, ar] = await Promise.all([
      api.getEvent(id!),
      api.getTeams(id!),
      api.getActivities(id!),
    ]);
    setEvent(ev);
    setMeta({ name: ev.name, date: ev.date ?? '', location: ev.location ?? '', status: ev.status });
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
    await api.createActivity(id!, activityName.trim());
    setActivityName('');
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

      {/* Event meta */}
      <div className="card">
        <h3>{t.edit}</h3>
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
        <button onClick={saveMeta} className="festive-button">
          {t.save}
        </button>
      </div>

      <div className="card">
        <h3>{t.addTeam}</h3>
        <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={t.teamName} />
        <button onClick={addTeam} className="festive-button">
          {t.addTeam}
        </button>
      </div>

      <div className="card">
        <h3>{t.addActivity}</h3>
        <input
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          placeholder={t.activityName}
        />
        <button onClick={addActivity} className="festive-button">
          {t.addActivity}
        </button>
        {activities.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {activities.map((a) => (
              <div
                key={a.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}
              >
                <span style={{ textAlign: 'left' }}>{a.name}</span>
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
      </div>

      <div className="card">
        <h3>🎯 {t.scoringMode}</h3>
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

        {selectedActivity ? (
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
      </div>

      <h2>{t.teamsQr}</h2>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', fontSize: '0.85rem', opacity: 0.85 }}>
            {t.bonus}
            <input
              type="number"
              defaultValue={team.admin_points}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10) || 0;
                if (v !== team.admin_points) setBonus(team.id, v);
              }}
              style={{ width: 90, margin: 0 }}
            />
          </label>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
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
      </div>

      <div className="card" style={{ borderColor: 'var(--error)', background: 'rgba(231, 76, 60, 0.08)' }}>
        <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>{t.dangerZone}</h2>
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
      </div>
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
