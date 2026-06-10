import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A card whose content collapses behind a clickable header. Independent
 * (several can be open at once). Collapsed by default.
 */
export const Collapsible: React.FC<{
  title: React.ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, danger = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`card collapsible${danger ? ' collapsible--danger' : ''}`}>
      <button
        type="button"
        className="collapsible-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{title}</span>
        <ChevronDown
          size={20}
          className="collapsible-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
};
