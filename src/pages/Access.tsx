import React from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../i18n';

/**
 * Big QR of the current origin: display it on the organiser's screen so each
 * tablet/phone can scan it to open the app (must be on the same network).
 */
export const Access: React.FC = () => {
  const origin = window.location.origin;
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin);

  return (
    <div className="app-container">
      <h1>📲 {t.tabletAccess}</h1>
      <div className="card">
        <p style={{ opacity: 0.85 }}>{t.tabletAccessHint}</p>
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 16,
            display: 'inline-block',
            margin: '10px auto',
          }}
        >
          <QRCodeSVG value={origin} size={260} />
        </div>
        <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', wordBreak: 'break-all' }}>
          {origin}
        </p>
        {isLocalhost && (
          <p style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{t.localhostWarning}</p>
        )}
      </div>
      <Link to="/admin" className="festive-button" style={{ textDecoration: 'none', display: 'block' }}>
        ← {t.adminDashboard}
      </Link>
    </div>
  );
};
