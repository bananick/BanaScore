/**
 * Configuration du tournoi « Team Building IFP School » (24 équipes, 6 ateliers
 * + course d'orientation). Source de vérité unique pour :
 *  - le barème des ateliers classés,
 *  - le carré latin des rotations (atelier × rotation → groupe),
 *  - les horaires,
 *  - le barème de la course d'orientation.
 *
 * Le total mondial est la simple somme des points de chaque épreuve : les
 * ateliers plafonnent à 10 000 (bloc 60 % = 6 × 10 000 = 60 000) et la course à
 * 40 000 (bloc 40 %), soit un maximum de 100 000 points.
 */

export const IFP_EVENT_NAME = 'Team Building IFP School';

/** Barème des ateliers classés : rang 1 → 4. */
export const BAREME = [10000, 9000, 8000, 7500];

export type AtelierKind = 'rank-strict' | 'rank-duo' | 'funflasher';

export interface Atelier {
  index: number; // position dans le carré latin (0..5)
  name: string; // libellé de l'atelier (= workshop de l'activité)
  kind: AtelierKind;
  staff: string;
  /** Lettre du groupe accueilli à chaque rotation R1..R6. */
  rotations: [string, string, string, string, string, string];
}

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Group = (typeof GROUPS)[number];

/** Les 24 équipes réparties dans les 6 groupes (ordre alphabétique). */
export const GROUP_TEAMS: Record<Group, string[]> = {
  A: ['ABUJA', 'ALGER', 'AMSTERDAM', 'ASTANA'],
  B: ['BAKOU', 'BANGKOK', 'BEYROUTH', 'BOGOTA'],
  C: ['BRASILIA', 'BRUXELLES', 'BUCAREST', 'DAKAR'],
  D: ['ISLAMABAD', 'KINSHASA', 'LJUBLJANA', 'MADRID'],
  E: ['NEW DELHI', 'PARIS', 'RABAT', 'ROME'],
  F: ['SEOUL', 'WINDHOEK', 'YAMOUSSOUKRO', 'YAOUNDE'],
};

/** Horaires des 6 rotations (25 min + 5 min de transition). */
export const HORAIRES = [
  '13h30 – 13h55',
  '14h00 – 14h25',
  '14h30 – 14h55',
  '15h00 – 15h25',
  '15h30 – 15h55',
  '16h00 – 16h25',
];

/**
 * Carré latin des rotations (vérifié sur les fiches ateliers du PDF V2).
 * Chaque groupe passe une seule fois par atelier ; à une rotation donnée, un
 * atelier accueille exactement un groupe (4 équipes).
 */
export const ATELIERS: Atelier[] = [
  { index: 0, name: 'Water Challenge', kind: 'rank-strict', staff: 'Mino + Lilian', rotations: ['A', 'F', 'E', 'D', 'C', 'B'] },
  { index: 1, name: 'AthléTower', kind: 'rank-strict', staff: 'Sarah + Nina', rotations: ['B', 'A', 'F', 'E', 'D', 'C'] },
  { index: 2, name: 'Jeux de Billes', kind: 'rank-duo', staff: 'Chiara', rotations: ['C', 'B', 'A', 'F', 'E', 'D'] },
  { index: 3, name: 'PassBall', kind: 'rank-strict', staff: 'Alexandre + Marlène', rotations: ['D', 'C', 'B', 'A', 'F', 'E'] },
  { index: 4, name: 'FunFlasher', kind: 'funflasher', staff: 'Karim', rotations: ['E', 'D', 'C', 'B', 'A', 'F'] },
  { index: 5, name: 'LaserGame', kind: 'rank-duo', staff: 'Fred', rotations: ['F', 'E', 'D', 'C', 'B', 'A'] },
];

export const COURSE_NAME = "Course d'orientation";
export const COURSE_MAX = 40000; // 1re place (bloc 40 %)
export const FUNFLASHER_MIN = 7500;
export const FUNFLASHER_MAX = 10000;

/**
 * Barème de la course d'orientation : 1er = 40 000, écart 2000 (1→2), 1000
 * (2→3 et 3→4), puis 500 par place. 24e ≈ 26 000. Ex æquo → mêmes points.
 */
export function coursePoints(position: number): number {
  const p = Math.max(1, Math.round(position));
  if (p <= 1) return 40000;
  if (p === 2) return 38000;
  if (p === 3) return 37000;
  return Math.max(0, 36000 - 500 * (p - 4));
}

/** Position (1..N) correspondant à un total de points de course, ou null. */
export function coursePositionFromPoints(points: number, maxPos = 24): number | null {
  if (!points) return null;
  for (let p = 1; p <= maxPos; p++) {
    if (coursePoints(p) === points) return p;
  }
  return null;
}

/** Retrouve un atelier IFP à partir d'un libellé (workshop ou nom d'activité). */
export function atelierByLabel(label?: string | null): Atelier | undefined {
  if (!label) return undefined;
  const norm = label.trim().toLowerCase();
  return ATELIERS.find((a) => a.name.toLowerCase() === norm);
}

/** Vrai si le libellé correspond à l'épreuve « Course d'orientation ». */
export function isCourseLabel(label?: string | null): boolean {
  return !!label && label.trim().toLowerCase() === COURSE_NAME.toLowerCase();
}

/** Rang (1..4) correspondant à un total de points d'atelier, ou 0 si aucun. */
export function rankFromPoints(points: number): number {
  const i = BAREME.indexOf(points);
  return i >= 0 ? i + 1 : 0;
}

/**
 * Index de la rotation en cours (0..5) d'après l'heure locale, ou -1 hors
 * créneau. Purement indicatif (met en avant la session « en cours »).
 */
export function currentRotationIndex(now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  const bounds = [
    [13 * 60 + 30, 13 * 60 + 55],
    [14 * 60 + 0, 14 * 60 + 25],
    [14 * 60 + 30, 14 * 60 + 55],
    [15 * 60 + 0, 15 * 60 + 25],
    [15 * 60 + 30, 15 * 60 + 55],
    [16 * 60 + 0, 16 * 60 + 25],
  ];
  return bounds.findIndex(([s, e]) => mins >= s && mins <= e);
}
