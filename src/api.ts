import axios from 'axios';
import type {
  ActivityDTO,
  EventDTO,
  EventReport,
  EventStats,
  EventStatus,
  ParticipantDTO,
  RankingEntry,
  ScoreDTO,
  TeamDTO,
  VoteDTO,
} from './types';

const TOKEN_KEY = 'banascore_admin_token';

export const adminToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isSet: () => !!localStorage.getItem(TOKEN_KEY),
};

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  const token = adminToken.get();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['x-admin-token'] = token;
  }
  return config;
});

/** Extract a human-friendly message from a structured API error response. */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | string | undefined;
    if (typeof data === 'string' && data) return data;
    if (data && typeof data === 'object' && data.error?.message) return data.error.message;
  }
  return fallback;
}

export function isUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

// --- Admin auth ---
export const login = (password: string) =>
  http.post<{ token: string }>('/admin/login', { password }).then((r) => r.data.token);
export const checkSession = () => http.get('/admin/session').then(() => true);
export const changePassword = (currentPassword: string, newPassword: string) =>
  http.post('/admin/password', { currentPassword, newPassword }).then((r) => r.data);

// --- Events ---
export const getEvents = (all = false) =>
  http.get<EventDTO[]>('/events', { params: all ? { all: 1 } : {} }).then((r) => r.data);
export const getEvent = (id: string | number) =>
  http.get<EventDTO>(`/events/${id}`).then((r) => r.data);
export const createEvent = (data: { name: string; date?: string; location?: string }) =>
  http.post<{ id: number }>('/events', data).then((r) => r.data);
export const updateEvent = (
  id: number,
  data: {
    name: string;
    date: string | null;
    location: string | null;
    status: EventStatus;
    maxVotes: number;
    brandColor: string | null;
    logoUrl: string | null;
  },
) => http.patch<EventDTO>(`/events/${id}`, data).then((r) => r.data);
export const deleteEvent = (id: number) => http.delete(`/events/${id}`);
export const duplicateEvent = (id: number, name?: string) =>
  http.post<{ id: number }>(`/events/${id}/duplicate`, name ? { name } : {}).then((r) => r.data);
export const getReport = (id: string | number) =>
  http.get<EventReport>(`/events/${id}/report`).then((r) => r.data);
export const getStats = (id: string | number) =>
  http.get<EventStats>(`/events/${id}/stats`).then((r) => r.data);

// --- Teams ---
export const getTeams = (eventId: string | number) =>
  http.get<TeamDTO[]>(`/events/${eventId}/teams`).then((r) => r.data);
export const createTeam = (eventId: string | number, name: string) =>
  http.post<{ id: number; qr_token: string }>(`/events/${eventId}/teams`, { name }).then((r) => r.data);
export const updateTeam = (
  eventId: string | number,
  teamId: number,
  data: { name?: string; adminPoints?: number; bonusLabel?: string | null },
) => http.patch<TeamDTO>(`/events/${eventId}/teams/${teamId}`, data).then((r) => r.data);
export const deleteTeam = (eventId: string | number, teamId: number) =>
  http.delete(`/events/${eventId}/teams/${teamId}`);

// --- Activities ---
export const getActivities = (eventId: string | number) =>
  http.get<ActivityDTO[]>(`/events/${eventId}/activities`).then((r) => r.data);
export const createActivity = (eventId: string | number, name: string) =>
  http.post<{ id: number }>(`/events/${eventId}/activities`, { name }).then((r) => r.data);
export const updateActivity = (
  activityId: number,
  data: { name?: string; coefficient?: number },
) => http.patch<ActivityDTO>(`/activities/${activityId}`, data).then((r) => r.data);
export const deleteActivity = (activityId: number) => http.delete(`/activities/${activityId}`);

export const getScores = (activityId: number) =>
  http.get<ScoreDTO[]>(`/activities/${activityId}/scores`).then((r) => r.data);
export const setScore = (activityId: number, teamId: number, points: number | null) =>
  http.patch(`/activities/${activityId}/scores/${teamId}`, { points });

// --- Participants & votes ---
export const register = (data: { pseudo: string; qrToken: string; deviceId: string }) =>
  http.post<ParticipantDTO>('/participants/register', data).then((r) => r.data);
export const getParticipant = (id: string | number) =>
  http.get<ParticipantDTO>(`/participants/${id}`).then((r) => r.data);
export const getMyVotes = (id: string | number) =>
  http.get<VoteDTO[]>(`/participants/${id}/votes`).then((r) => r.data);
export const castVote = (participantId: string | number, votedTeamId: number) =>
  http.post('/votes', { participantId: Number(participantId), votedTeamId });

// --- Rankings ---
export const rankingGlobal = (eventId: string | number) =>
  http.get<RankingEntry[]>(`/events/${eventId}/ranking/global`).then((r) => r.data);
export const rankingVotes = (eventId: string | number) =>
  http.get<RankingEntry[]>(`/events/${eventId}/ranking/votes`).then((r) => r.data);
export const rankingActivity = (eventId: string | number, activityId: string | number) =>
  http
    .get<{ ranking: RankingEntry[]; activityName: string }>(
      `/events/${eventId}/ranking/activity/${activityId}`,
    )
    .then((r) => r.data);
