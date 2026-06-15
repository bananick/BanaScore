import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CriterionDTO } from '../types';
import { t } from '../i18n';

/** Inline editor for an activity's criteria (label + points), with add/delete. */
export const CriteriaEditor: React.FC<{
  criteria: CriterionDTO[];
  onAdd: (label: string, points: number) => void;
  onDelete: (criterionId: number) => void;
}> = ({ criteria, onAdd, onDelete }) => {
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState('');

  const add = () => {
    const p = parseInt(points, 10);
    if (!label.trim() || !Number.isFinite(p)) return;
    onAdd(label.trim(), p);
    setLabel('');
    setPoints('');
  };

  return (
    <div className="criteria-editor">
      {criteria.map((c) => (
        <div key={c.id} className="criteria-editor-row">
          <span style={{ flex: 1 }}>{c.label}</span>
          <span className="criterion-pts">+{c.points}</span>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            title="Supprimer"
            onClick={() => onDelete(c.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="criteria-editor-add">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t.criterionLabel}
          style={{ margin: 0, flex: 1, minWidth: 100 }}
        />
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={t.criterionPoints}
          style={{ margin: 0, width: 90 }}
        />
        <button type="button" className="festive-button" style={{ margin: 0, width: 'auto' }} onClick={add}>
          +
        </button>
      </div>
    </div>
  );
};
