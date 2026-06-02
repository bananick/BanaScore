export type EventStatus = 'open' | 'closed' | 'archived';

export interface EventDTO {
  id: number;
  name: string;
  date: string | null;
  location: string | null;
  status: EventStatus;
  created_at: string;
}

export interface TeamDTO {
  id: number;
  name: string;
  event_id: number;
  qr_token: string;
  admin_points: number;
}

export interface ActivityDTO {
  id: number;
  event_id: number;
  name: string;
}

export interface ScoreDTO {
  id: number;
  activity_id: number;
  team_id: number;
  points: number;
}

export interface ParticipantDTO {
  id: number;
  pseudo: string;
  team_id: number;
  event_id: number;
  device_id: string;
  teamId?: number;
  eventId?: number;
}

export interface VoteDTO {
  id: number;
  participant_id: number;
  voted_team_id: number;
  event_id: number;
  timestamp: string;
}

export interface RankingEntry {
  id: number;
  name: string;
  score: number;
}
