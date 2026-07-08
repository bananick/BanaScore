export type EventStatus = 'open' | 'closed' | 'archived';

export interface EventDTO {
  id: number;
  name: string;
  date: string | null;
  location: string | null;
  status: EventStatus;
  max_votes: number;
  voting_enabled: number; // 0/1
  ranking_mode: string; // 'raw' | 'normalized'
  workshop_weights: string | null; // JSON
  brand_color: string | null;
  logo_url: string | null;
  scorer_code: string | null;
  created_at: string;
}

export interface TeamDTO {
  id: number;
  name: string;
  event_id: number;
  qr_token?: string; // only returned to admin requests
  admin_points: number;
  bonus_label: string | null;
}

export interface ActivityDTO {
  id: number;
  event_id: number;
  name: string;
  coefficient: number;
  workshop: string | null;
  scoring_mode: string; // 'criteria' | 'free' | 'preset'
  preset_points: number[] | null;
}

export interface CriterionDTO {
  id: number;
  activity_id: number;
  label: string;
  points: number;
  position: number;
}

export interface ActivityScoring {
  activity: { id: number; name: string; scoring_mode: string; preset_points: number[] | null };
  criteria: CriterionDTO[];
  scores: { team_id: number; points: number }[];
  teamCriteria: { team_id: number; criterion_id: number }[];
}

export interface WorkshopRanking {
  workshop: string;
  ranking: RankingEntry[];
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
  rankingMode: string;
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
