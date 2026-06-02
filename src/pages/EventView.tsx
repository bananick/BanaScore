import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import * as api from '../api';
import type { ActivityDTO, EventDTO, ParticipantDTO, TeamDTO, VoteDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { usePolling } from '../hooks';

const MAX_VOTES = 3;

export const EventView: React.FC = () => {
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [participant, setParticipant] = useState<ParticipantDTO | null>(null);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [myVotes, setMyVotes] = useState<VoteDTO[]>([]);
  const [activities, setActivities] = useState<ActivityDTO[]>([]);

  const refresh = async () => {
    const pId = localStorage.getItem(`participant_event_${id}`);
    const [ev, tr, ar] = await Promise.all([
      api.getEvent(id!),
      api.getTeams(id!),
      api.getActivities(id!),
    ]);
    setEvent(ev);
    setTeams(tr);
    setActivities(ar);
    if (pId) {
      const [p, v] = await Promise.all([api.getParticipant(pId), api.getMyVotes(pId)]);
      setParticipant(p);
      setMyVotes(v);
    }
  };

  // Auto-refresh every 5s so votes/teams stay live like the ranking pages.
  usePolling(() => {
    refresh().catch(() => undefined);
  }, 5000, [id]);

  const handleVote = async (teamId: number) => {
    const pId = localStorage.getItem(`participant_event_${id}`);
    if (!pId) {
      toast.error(t.registerFirst);
      return;
    }
    try {
      await api.castVote(pId, teamId);
      await refresh();
      toast.success(t.voteCast);
    } catch (err) {
      toast.error(api.apiErrorMessage(err, t.voteFailed));
    }
  };

  const hasVotedFor = (teamId: number) => myVotes.some((v) => v.voted_team_id === teamId);
  const isClosed = event?.status !== 'open';
  const remaining = MAX_VOTES - myVotes.length;

  return (
    <div className="app-container">
      <header style={{ marginBottom: 30 }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          🍌 BanaScore
        </Link>
        <h1>{participant ? t.hello(participant.pseudo) : t.eventView}</h1>
      </header>

      <div className="card">
        <h2>🗳️ {t.voteForTeams}</h2>
        {isClosed ? (
          <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{t.eventClosedNotice}</p>
        ) : (
          <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{t.votesRemaining(remaining)}</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 20 }}>
          {teams.map((team) => {
            const voted = hasVotedFor(team.id);
            const isOwnTeam = participant?.team_id === team.id;
            const disabled = voted || isOwnTeam || myVotes.length >= MAX_VOTES || isClosed;
            return (
              <button
                key={team.id}
                disabled={disabled}
                className={`card vote-card ${voted ? 'selected' : ''}`}
                style={{ margin: 0, padding: 20 }}
                onClick={() => handleVote(team.id)}
              >
                <h3 style={{ margin: 0 }}>{team.name}</h3>
                {isOwnTeam && <span style={{ fontSize: '0.6rem' }}>{t.yourTeam}</span>}
                {voted && <CheckCircle size={16} style={{ marginTop: 5 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>📊 {t.liveRankings}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <Link to={`/event/${id}/ranking/global`} className="festive-button" style={{ fontSize: '0.9rem' }}>
            {t.globalScore}
          </Link>
          <Link
            to={`/event/${id}/ranking/votes`}
            className="festive-button"
            style={{ fontSize: '0.9rem', background: 'var(--accent)' }}
          >
            {t.voteRanking}
          </Link>
          {activities.map((a) => (
            <Link
              key={a.id}
              to={`/event/${id}/ranking/activity/${a.id}`}
              className="festive-button"
              style={{ fontSize: '0.9rem', background: 'var(--blue)' }}
            >
              {a.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
