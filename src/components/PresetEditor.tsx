import React, { useState } from 'react';
import { t } from '../i18n';

const DEFAULT = '600, 500, 400, 300, 200, 100, 0';

/**
 * Inline editor for a preset-mode activity's point ladder. The comma-separated
 * values become the tappable buttons on the scoring screen.
 */
export const PresetEditor: React.FC<{
  values: number[];
  onSave: (values: number[]) => void;
}> = ({ values, onSave }) => {
  const [text, setText] = useState(values.length ? values.join(', ') : DEFAULT);

  const save = () => {
    const parsed = text
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 0);
    onSave(parsed);
  };

  return (
    <div style={{ marginTop: 10, textAlign: 'left' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.75, marginBottom: 4 }}>
        {t.presetPointsLabel}
      </label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={DEFAULT}
        style={{ margin: 0 }}
      />
      <p style={{ fontSize: '0.75rem', opacity: 0.55, margin: '4px 0 0' }}>{t.presetPointsHint}</p>
    </div>
  );
};
