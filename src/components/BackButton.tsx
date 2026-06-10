import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { t } from '../i18n';

/**
 * Top-left "back" control: returns to the previous page in history, or to
 * `fallback` (default home) when the page was opened directly (e.g. via a QR
 * code, with no history to go back to).
 */
export const BackButton: React.FC<{ fallback?: string; label?: string }> = ({
  fallback = '/',
  label,
}) => {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button type="button" onClick={goBack} className="back-button" aria-label={label ?? t.back}>
      <ArrowLeft size={18} />
      <span>{label ?? t.back}</span>
    </button>
  );
};
