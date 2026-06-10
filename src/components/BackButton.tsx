import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n';

/**
 * Top-left "back" control. By default returns to the previous page in history
 * (or `fallback` when opened directly, e.g. via a QR code). Pass `to` to force
 * a fixed destination instead — useful to avoid back-and-forth loops between
 * two pages that link to each other.
 */
export const BackButton: React.FC<{ fallback?: string; label?: string; to?: string }> = ({
  fallback = '/',
  label,
  to,
}) => {
  const navigate = useNavigate();
  const goBack = () => {
    if (to) navigate(to);
    else if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button type="button" onClick={goBack} className="back-button" aria-label={label ?? t.back}>
      <ArrowLeft size={18} />
      <span>{label ?? t.back}</span>
    </button>
  );
};
