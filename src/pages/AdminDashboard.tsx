import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Plus, Trash2 } from 'lucide-react';
import * as api from '../api';
import type { EventDTO } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { PasswordInput } from '../components/PasswordInput';
import { Collapsible } from '../components/Collapsible';

const STATUS_LABELS: Record<EventDTO['status'], string> = {
  open: t.statusOpen,
  closed: t.statusClosed,
  archived: t.statusArchived,
};

export const AdminDashboard: React.FC = () => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdBusy, setPwdBusy] = useState(false);
  const toast = useToast();

  const refresh = () => api.getEvents(true).then(setEvents).catch(() => undefined);
  useEffect(() => {
    refresh();
  }, []);

  const createEvent = async () => {
    if (!name.trim()) return;
    try {
      await api.createEvent({ name: name.trim(), date: date || undefined, location: location || undefined });
      setName('');
      setDate('');
      setLocation('');
      refresh();
    } catch (err) {
      toast.error(api.apiErrorMessage(err));
    }
  };

  const duplicateEvent = async (event: EventDTO) => {
    if (!window.confirm(t.duplicateConfirm(event.name))) return;
    try {
      await api.duplicateEvent(event.id);
      await refresh();
      toast.success(t.duplicated);
    } catch (err) {
      toast.error(api.apiErrorMessage(err));
    }
  };

  const deleteEvent = async (event: EventDTO) => {
    if (!window.confirm(t.deleteEventConfirm(event.name))) return;
    try {
      await api.deleteEvent(event.id);
      refresh();
    } catch (err) {
      toast.error(api.apiErrorMessage(err, t.couldNotDelete));
    }
  };

  const submitPassword = async () => {
    if (pwdBusy) return;
    if (pwd.next.length < 4) {
      toast.error(t.passwordTooShort);
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error(t.passwordsDontMatch);
      return;
    }
    setPwdBusy(true);
    try {
      await api.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      toast.success(t.passwordChanged);
    } catch (err) {
      toast.error(api.apiErrorMessage(err));
    } finally {
      setPwdBusy(false);
    }
  };

  const logout = () => {
    api.adminToken.clear();
    window.location.reload();
  };

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white' }}>
          ← {t.home}
        </Link>
        <h1>{t.adminTitle}</h1>
        <button type="button" className="icon-btn" onClick={logout} title={t.logout}>
          ⎋
        </button>
      </header>

      <Link
        to="/access"
        className="festive-button"
        style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}
      >
        📲 {t.tabletAccessLink}
      </Link>

      <div className="card">
        <h2>{t.createEvent}</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.eventName} />
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder={t.eventDate} />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t.eventLocation}
        />
        <button onClick={createEvent} className="festive-button">
          <Plus size={18} /> {t.create}
        </button>
      </div>

      <div className="card">
        <h2>{t.existingEvents}</h2>
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              borderBottom: '1px solid #333',
              padding: '10px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <Link
              to={`/admin/event/${e.id}`}
              style={{ color: 'var(--primary)', fontWeight: 'bold', textAlign: 'left', flex: 1 }}
            >
              {e.name}
              <span style={{ opacity: 0.5, fontWeight: 'normal', fontSize: '0.8rem', marginLeft: 8 }}>
                {STATUS_LABELS[e.status]}
                {e.date ? ` · ${e.date}` : ''}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => duplicateEvent(e)}
              className="icon-btn"
              title={t.duplicate}
              aria-label={t.duplicate}
            >
              <Copy size={18} />
            </button>
            <button
              type="button"
              onClick={() => deleteEvent(e)}
              className="icon-btn icon-btn--danger"
              title={t.deleteEvent}
              aria-label={t.deleteEvent}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <Collapsible title={`🔑 ${t.changePassword}`}>
        <PasswordInput
          value={pwd.current}
          onChange={(v) => setPwd({ ...pwd, current: v })}
          placeholder={t.currentPassword}
        />
        <PasswordInput
          value={pwd.next}
          onChange={(v) => setPwd({ ...pwd, next: v })}
          placeholder={t.newPassword}
        />
        <PasswordInput
          value={pwd.confirm}
          onChange={(v) => setPwd({ ...pwd, confirm: v })}
          onEnter={submitPassword}
          placeholder={t.confirmPassword}
        />
        <button onClick={submitPassword} className="festive-button" disabled={pwdBusy}>
          {t.changePassword}
        </button>
      </Collapsible>
    </div>
  );
};
