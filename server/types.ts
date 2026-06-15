import type { EventStatus } from './validation';

export interface EventRow {
  id: number;
  name: string;
  date: string | null;
  location: string | null;
  status: EventStatus;
  max_votes: number;
  voting_enabled: number; // 0/1
  ranking_mode: string; // 'raw' | 'normalized'
  workshop_weights: string | null; // JSON: { [atelier]: weight }
  brand_color: string | null;
  logo_url: string | null;
  scorer_code: string | null;
  created_at: string;
}

export interface TeamRow {
  id: number;
  name: string;
  event_id: number;
  qr_token: string;
  admin_points: number;
  bonus_label: string | null;
}

export interface ActivityRow {
  id: number;
  event_id: number;
  name: string;
  coefficient: number;
  workshop: string | null;
  scoring_mode: string; // 'criteria' | 'free'
}

export interface CriterionRow {
  id: number;
  activity_id: number;
  label: string;
  points: number;
  position: number;
}

export interface WorkshopRanking {
  workshop: string;
  ranking: RankingEntry[];
}

export interface ActivityScoreRow {
  id: number;
  activity_id: number;
  team_id: number;
  points: number;
}

export interface ParticipantRow {
  id: number;
  pseudo: string;
  team_id: number;
  event_id: number;
  device_id: string;
}

export interface VoteRow {
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
