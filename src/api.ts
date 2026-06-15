import axios from 'axios';
import type {
  ActivityDTO,
  ActivityScoring,
  CriterionDTO,
  EventDTO,
  EventReport,
  EventStats,
  EventStatus,
  ParticipantDTO,
  RankingEntry,
  ScoreDTO,
  TeamDTO,
  VoteDTO,
  WorkshopRanking,
} from './types';

const TOKEN_KEY = 'banascore_admin_token';

export const adminToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isSet: () => !!localStorage.getItem(TOKEN_KEY),
};

const SCORER_TOKEN_KEY = 'banascore_scorer_token';
const SCORER_EVENT_KEY = 'banascore_scorer_event';

export const scorerToken = {
  get: () => localStorage.getItem(SCORER_TOKEN_KEY),
  eventId: () => Number(localStorage.getItem(SCORER_EVENT_KEY)) || null,
  setForEvent: (eventId: number, token: string) => {
    localStorage.setItem(SCORER_TOKEN_KEY, token);
    localStorage.setItem(SCORER_EVENT_KEY, String(eventId));
  },
  clear: () => {
    localStorage.removeItem(SCORER_TOKEN_KEY);
    localStorage.removeItem(SCORER_EVENT_KEY);
  },
  isSetFor: (eventId: number | string) =>
    !!localStorage.getItem(SCORER_TOKEN_KEY) &&
    localStorage.getItem(SCORER_EVENT_KEY) === String(eventId),
};

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const token = adminToken.get();
  if (token) config.headers['x-admin-token'] = token;
  const scorer = scorerToken.get();
  if (scorer) config.headers['x-scorer-token'] = scorer;
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
export const getNetwork = () =>
  http.get<{ baseUrl: string }>('/network').then((r) => r.data.baseUrl);
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
    votingEnabled: boolean;
    rankingMode: 'raw' | 'normalized';
    workshopWeights: Record<string, number> | null;
    brandColor: string | null;
    logoUrl: string | null;
    scorerCode: string | null;
  },
) => http.patch<EventDTO>(`/events/${id}`, data).then((r) => r.data);
export const deleteEvent = (id: number) => http.delete(`/events/${id}`);
export const duplicateEvent = (id: number, name?: string) =>
  http.post<{ id: number }>(`/events/${id}/duplicate`, name ? { name } : {}).then((r) => r.data);
export const generateSessions = (id: number, count: number, prefix: string) =>
  http.post<{ ids: number[] }>(`/events/${id}/sessions`, { count, prefix }).then((r) => r.data);
export const getReport = (id: string | number) =>
  http.get<EventReport>(`/events/${id}/report`).then((r) => r.data);
export const getStats = (id: string | number) =>
  http.get<EventStats>(`/events/${id}/stats`).then((r) => r.data);
export const downloadReportPdf = (id: string | number) =>
  http.get(`/events/${id}/report.pdf`, { responseType: 'blob' }).then((r) => r.data as Blob);

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
export const createActivity = (eventId: string | number, name: string, workshop?: string) =>
  http
    .post<{ id: number }>(`/events/${eventId}/activities`, { name, workshop })
    .then((r) => r.data);
export const updateActivity = (
  activityId: number,
  data: { name?: string; coefficient?: number; workshop?: string | null; scoringMode?: string },
) => http.patch<ActivityDTO>(`/activities/${activityId}`, data).then((r) => r.data);

// --- Criteria (criteria scoring mode) ---
export const getCriteria = (activityId: number) =>
  http.get<CriterionDTO[]>(`/activities/${activityId}/criteria`).then((r) => r.data);
export const addCriterion = (activityId: number, label: string, points: number) =>
  http.post<{ id: number }>(`/activities/${activityId}/criteria`, { label, points }).then((r) => r.data);
export const updateCriterion = (criterionId: number, data: { label?: string; points?: number }) =>
  http.patch<CriterionDTO>(`/criteria/${criterionId}`, data).then((r) => r.data);
export const deleteCriterion = (criterionId: number) => http.delete(`/criteria/${criterionId}`);

// --- Scoring ---
export const getActivityScoring = (activityId: number) =>
  http.get<ActivityScoring>(`/activities/${activityId}/scoring`).then((r) => r.data);
export const toggleCriterion = (criterionId: number, teamId: number, achieved: boolean) =>
  http.patch(`/criteria/${criterionId}/teams/${teamId}`, { achieved });
export const resetScores = (eventId: string | number) =>
  http.post(`/events/${eventId}/reset-scores`);
export const deleteActivity = (activityId: number) => http.delete(`/activities/${activityId}`);

export const getScores = (activityId: number) =>
  http.get<ScoreDTO[]>(`/activities/${activityId}/scores`).then((r) => r.data);
export const setScore = (activityId: number, teamId: number, points: number | null) =>
  http.patch(`/activities/${activityId}/scores/${teamId}`, { points });

// --- Participants & votes ---
export const register = (data: {
  pseudo: string;
  deviceId: string;
  qrToken?: string;
  teamId?: number;
  eventId?: number;
}) => http.post<ParticipantDTO>('/participants/register', data).then((r) => r.data);
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
export const rankingWorkshops = (eventId: string | number) =>
  http.get<WorkshopRanking[]>(`/events/${eventId}/ranking/workshops`).then((r) => r.data);

// --- Scorer ("animateur") access ---
export const scorerLogin = (eventId: string | number, code: string) =>
  http.post<{ token: string }>(`/events/${eventId}/scorer-login`, { code }).then((r) => r.data.token);
export const checkScorerSession = (eventId: string | number) =>
  http.get(`/events/${eventId}/scorer-session`).then(() => true);
