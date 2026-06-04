export type EventStatus = 'open' | 'closed' | 'archived';

export interface EventDTO {
  id: number;
  name: string;
  date: string | null;
  location: string | null;
  status: EventStatus;
  max_votes: number;
  brand_color: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface TeamDTO {
  id: number;
  name: string;
  event_id: number;
  qr_token: string;
  admin_points: number;
  bonus_label: string | null;
}

export interface ActivityDTO {
  id: number;
  event_id: number;
  name: string;
  coefficient: number;
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

export interface EventReport {
  event: EventDTO;
  activities: { id: number; name: string; coefficient: number }[];
  teams: {
    id: number;
    name: string;
    activityPoints: Record<number, number>;
    activityTotal: number;
    votes: number;
    bonus: number;
    bonusLabel: string | null;
    total: number;
  }[];
  participantCount: number;
  generatedAt: string;
}

export interface EventStats {
  teams: number;
  participants: number;
  votes: number;
  activitiesTotal: number;
  activitiesScored: number;
  perTeam: { id: number; name: string; participants: number; votes: number }[];
}
