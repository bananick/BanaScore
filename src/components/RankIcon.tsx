import React from 'react';
import { Trophy } from 'lucide-react';

// Gold / silver / bronze cups for the podium.
const COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

/** Colored trophy (cup) for ranks 1–3; nothing for other ranks. */
export const RankIcon: React.FC<{ rank: number; size?: number }> = ({ rank, size = 20 }) => {
  if (rank < 1 || rank > 3) return null;
  const color = COLORS[rank - 1];
  return (
    <Trophy size={size} color={color} fill={color} style={{ verticalAlign: 'middle', flexShrink: 0 }} />
  );
};
