import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// --- COMPONENTS ---

const Home = () => {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    axios.get('/api/events').then(res => setEvents(res.data));
  }, []);

  return (
    <div className="app-container">
      <h1>🍌 BanaScore</h1>
      <p>The funnest way to vote for your events!</p>
      <div className="card">
        <h2>Open Events</h2>
        {events.length === 0 ? <p>No events yet. Create one in Admin!</p> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {events.map(e => (
              <li key={e.id} style={{ margin: '10px 0' }}>
                <Link to={`/event/${e.id}`} className="festive-button" style={{ display: 'block', textDecoration: 'none' }}>
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <hr />
        <Link to="/admin" style={{ color: 'var(--accent)' }}>Admin Dashboard</Link>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
    const [name, setName] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    
    useEffect(() => {
        axios.get('/api/events').then(res => setEvents(res.data));
    }, []);

    const createEvent = async () => {
        if (!name) return;
        await axios.post('/api/events', { name });
        setName('');
        const res = await axios.get('/api/events');
        setEvents(res.data);
    };

    const deleteEvent = async (eventId: number, eventName: string) => {
        if (!window.confirm(`Delete the event “${eventName}” and all its teams, votes and scores? This cannot be undone.`)) return;
        try {
            await axios.delete(`/api/events/${eventId}`);
            const res = await axios.get('/api/events');
            setEvents(res.data);
        } catch {
            alert('Could not delete the event.');
        }
    };

    return (
        <div className="app-container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ color: 'white' }}>← Home</Link>
                <h1>Admin</h1>
            </header>
            <div className="card">
                <h2>Create New Event</h2>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Event Name" />
                <button onClick={createEvent} className="festive-button"><Plus size={18} /> Create</button>
            </div>
            <div className="card">
                <h2>Existing Events</h2>
                {events.map(e => (
                    <div key={e.id} style={{ borderBottom: '1px solid #333', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <Link to={`/admin/event/${e.id}`} style={{ color: 'var(--primary)', fontWeight: 'bold', textAlign: 'left', flex: 1 }}>{e.name}</Link>
                        <button
                            type="button"
                            onClick={() => deleteEvent(e.id, e.name)}
                            className="icon-btn icon-btn--danger"
                            title="Delete event"
                            aria-label="Delete event"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AdminEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [teams, setTeams] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [teamScores, setTeamScores] = useState<any[]>([]);
    const [teamName, setTeamName] = useState('');
    const [activityName, setActivityName] = useState('');
    const [selectedActivity, setSelectedActivity] = useState<number | null>(null);

    const refresh = async () => {
        const tr = await axios.get(`/api/events/${id}/teams`);
        setTeams(tr.data);
        const ar = await axios.get(`/api/events/${id}/activities`);
        setActivities(ar.data);
        if (selectedActivity) {
            const sr = await axios.get(`/api/activities/${selectedActivity}/scores`);
            setTeamScores(sr.data);
        }
    };

    useEffect(() => { refresh(); }, [id, selectedActivity]);

    const addTeam = async () => {
        if (!teamName) return;
        await axios.post(`/api/events/${id}/teams`, { name: teamName });
        setTeamName('');
        refresh();
    };

    const addActivity = async () => {
        if (!activityName) return;
        await axios.post(`/api/events/${id}/activities`, { name: activityName });
        setActivityName('');
        refresh();
    };

    const deleteTeam = async (teamId: number, teamName: string) => {
        if (!window.confirm(`Delete the team “${teamName}”? Its participants, scores and related votes will be removed.`)) return;
        try {
            await axios.delete(`/api/events/${id}/teams/${teamId}`);
            refresh();
        } catch {
            alert('Could not delete the team.');
        }
    };

    const deleteEvent = async () => {
        if (!id || !window.confirm('Delete this event and all its data (teams, activities, votes)? This cannot be undone.')) return;
        try {
            await axios.delete(`/api/events/${id}`);
            navigate('/admin');
        } catch {
            alert('Could not delete the event.');
        }
    };

    const updateActivityScore = async (teamId: number, points: number | null) => {
        if (!selectedActivity) return;
        await axios.patch(`/api/activities/${selectedActivity}/scores/${teamId}`, { points });
        refresh();
    };

    const isPointTaken = (pt: number, currentTeamId: number) => {
        return teamScores.some(s => s.points === pt && s.team_id !== currentTeamId);
    };

    const getTeamScore = (teamId: number) => {
        return teamScores.find(s => s.team_id === teamId)?.points || null;
    };

    return (
        <div className="app-container">
            <h1>Event Management</h1>
            
            <div className="card">
                <h3>Add Team</h3>
                <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name" />
                <button onClick={addTeam} className="festive-button">Add Team</button>
            </div>

            <div className="card">
                <h3>Add Activity</h3>
                <input value={activityName} onChange={e => setActivityName(e.target.value)} placeholder="Activity Name (e.g. Quizz, Sport)" />
                <button onClick={addActivity} className="festive-button">Add Activity</button>
            </div>

            <div className="card">
                <h3>🎯 Scoring Mode</h3>
                <select onChange={(e) => setSelectedActivity(parseInt(e.target.value) || null)} style={{ padding: '12px', borderRadius: '10px', width: '100%', marginBottom: '20px', background: '#333', color: 'white', border: '1px solid var(--primary)' }}>
                    <option value="">Select Activity to Score</option>
                    {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>

                {selectedActivity ? (
                    <div>
                        <h4>Distribute Points (1 to {teams.length})</h4>
                        {teams.map(t => {
                            const currentScore = getTeamScore(t.id);
                            return (
                                <div key={t.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', margin: '10px 0', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <strong style={{ color: 'var(--primary)' }}>{t.name}</strong>
                                        {currentScore && <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}><CheckCircle size={14} /> Assigned: {currentScore} pts</span>}
                                    </div>
                                    <div className="score-grid">
                                        {Array.from({ length: teams.length }, (_, i) => i + 1).map(pt => (
                                            <button 
                                                key={pt} 
                                                className={`score-btn ${currentScore === pt ? 'active' : ''}`}
                                                disabled={isPointTaken(pt, t.id)}
                                                onClick={() => updateActivityScore(t.id, pt)}
                                            >
                                                {pt}
                                            </button>
                                        ))}
                                        {currentScore && (
                                            <button className="clear-btn" onClick={() => updateActivityScore(t.id, null)} title="Clear points">
                                                <XCircle size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <p>Select an activity above to distribute rank-based points.</p>}
            </div>

            <h2>Teams QR Codes</h2>
            {teams.map(t => (
                <div key={t.id} className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, textAlign: 'left' }}>{t.name}</h3>
                        <button
                            type="button"
                            onClick={() => deleteTeam(t.id, t.name)}
                            className="icon-btn icon-btn--danger"
                            title="Delete team"
                            aria-label="Delete team"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                        <QRCodeSVG value={`${window.location.origin}/register/${t.qr_token}`} size={160} />
                    </div>
                    {/* Token hidden as requested */}
                </div>
            ))}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                <Link to={`/event/${id}/ranking/global`} className="festive-button" style={{ textDecoration: 'none' }}>🏆 Global Ranking</Link>
                <Link to={`/event/${id}/ranking/votes`} className="festive-button" style={{ textDecoration: 'none', background: 'var(--accent)' }}>🗳️ Votes Only</Link>
            </div>

            <div className="card" style={{ borderColor: 'var(--error)', background: 'rgba(231, 76, 60, 0.08)' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Danger zone</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 12px' }}>Delete this event and all related teams, activities, participants and votes.</p>
                <button type="button" onClick={deleteEvent} className="festive-button" style={{ background: 'var(--error)', color: 'white', boxShadow: 'none' }}>
                    <Trash2 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Delete this event
                </button>
            </div>
        </div>
    );
};

const Register = () => {
    const { token } = useParams();
    const [pseudo, setPseudo] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        if (!pseudo) return;
        const deviceId = localStorage.getItem('deviceId') || Math.random().toString(36).substring(7);
        localStorage.setItem('deviceId', deviceId);

        try {
            const res = await axios.post('/api/participants/register', { pseudo, qrToken: token, deviceId });
            localStorage.setItem(`participant_event_${res.data.eventId}`, res.data.id);
            navigate(`/event/${res.data.eventId}`);
        } catch (err) {
            alert('Error during registration.');
        }
    };

    return (
        <div className="app-container">
            <h1>Ready to Play?</h1>
            <div className="card">
                <input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="Your Pseudo" />
                <button onClick={handleRegister} className="festive-button">Join Team</button>
            </div>
        </div>
    );
}

const EventView = () => {
    const { id } = useParams();
    const [participant, setParticipant] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [myVotes, setMyVotes] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);

    const refresh = async () => {
        const pId = localStorage.getItem(`participant_event_${id}`);
        if (pId) {
            const pr = await axios.get(`/api/participants/${pId}`);
            setParticipant(pr.data);
            const vr = await axios.get(`/api/participants/${pId}/votes`);
            setMyVotes(vr.data);
        }
        const tr = await axios.get(`/api/events/${id}/teams`);
        setTeams(tr.data);
        const ar = await axios.get(`/api/events/${id}/activities`);
        setActivities(ar.data);
    };

    useEffect(() => { refresh(); }, [id]);

    const handleVote = async (teamId: number) => {
        const pId = localStorage.getItem(`participant_event_${id}`);
        if (!pId) return alert('Register first!');
        try {
            await axios.post('/api/votes', { participantId: pId, votedTeamId: teamId });
            refresh();
            alert('Vote casted!');
        } catch (err: any) {
            alert(err.response?.data || 'Vote failed');
        }
    };

    const hasVotedFor = (teamId: number) => myVotes.some(v => v.voted_team_id === teamId);

    return (
        <div className="app-container">
            <header style={{ marginBottom: '30px' }}>
                <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>🍌 BanaScore</Link>
                <h1>{participant ? `Hello, ${participant.pseudo}!` : 'Event View'}</h1>
            </header>
            
            <div className="card">
                <h2>🗳️ VOTE FOR TEAMS</h2>
                <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{3 - myVotes.length} votes remaining</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                    {teams.map(t => {
                        const voted = hasVotedFor(t.id);
                        const isOwnTeam = participant?.team_id === t.id;
                        const disabled = voted || isOwnTeam || myVotes.length >= 3;
                        
                        return (
                            <button 
                                key={t.id} 
                                disabled={disabled}
                                className={`card vote-card ${voted ? 'selected' : ''}`}
                                style={{ margin: 0, padding: '20px' }}
                                onClick={() => handleVote(t.id)}
                            >
                                <h3 style={{ margin: 0 }}>{t.name}</h3>
                                {isOwnTeam && <span style={{ fontSize: '0.6rem' }}>(Your Team)</span>}
                                {voted && <CheckCircle size={16} style={{ marginTop: '5px' }} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="card">
                <h2>📊 Live Rankings</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                    <Link to={`/event/${id}/ranking/global`} className="festive-button" style={{ fontSize: '0.9rem' }}>Global Score</Link>
                    <Link to={`/event/${id}/ranking/votes`} className="festive-button" style={{ fontSize: '0.9rem', background: 'var(--accent)' }}>Vote Ranking</Link>
                    {activities.map(a => (
                        <Link key={a.id} to={`/event/${id}/ranking/activity/${a.id}`} className="festive-button" style={{ fontSize: '0.9rem', background: 'var(--blue)' }}>
                            {a.name}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

const Ranking = () => {
    const { id, type, activityId } = useParams();
    const [ranking, setRanking] = useState<any[]>([]);
    const [title, setTitle] = useState('');

    const fetchRanking = async () => {
        let url = `/api/events/${id}/ranking/global`;
        let t = '🏆 Global Score';

        if (type === 'votes') {
            url = `/api/events/${id}/ranking/votes`;
            t = '🗳️ Vote Rankings';
            const res = await axios.get(url);
            setRanking(res.data);
            setTitle(t);
        } else if (type === 'activity' && activityId) {
            url = `/api/events/${id}/ranking/activity/${activityId}`;
            const res = await axios.get(url);
            setRanking(res.data.ranking);
            setTitle(`🎯 ${res.data.activityName} Ranking`);
        } else {
            const res = await axios.get(url);
            setRanking(res.data);
            setTitle(t);
        }
    }

    useEffect(() => {
        fetchRanking();
        const interval = setInterval(fetchRanking, 5000);
        return () => clearInterval(interval);
    }, [id, type, activityId]);

    return (
        <div className="app-container">
            <h1 style={{ fontSize: '2rem' }}>{title}</h1>
            <div className="card">
                {ranking.map((t, index) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: index === 0 ? '1.4rem' : '1.1rem', background: index === 0 ? 'rgba(241, 196, 15, 0.1)' : 'transparent', borderRadius: index === 0 ? '10px' : '0' }}>
                        <span>
                            <span style={{ opacity: 0.5, marginRight: '10px' }}>#{index + 1}</span>
                            {t.name} {index === 0 && '👑'}
                        </span>
                        <strong style={{ color: index === 0 ? 'var(--primary)' : 'inherit' }}>{t.score} pts</strong>
                    </div>
                ))}
            </div>
            <Link to={`/event/${id}`} className="festive-button" style={{ textDecoration: 'none', display: 'block' }}>Back to Event</Link>
        </div>
    );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/event/:id" element={<AdminEventDetail />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/event/:id" element={<EventView />} />
        <Route path="/event/:id/ranking/:type" element={<Ranking />} />
        <Route path="/event/:id/ranking/:type/:activityId" element={<Ranking />} />
      </Routes>
    </Router>
  );
}

export default App;
