import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import * as api from '../api';
import { t } from '../i18n';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Big QR + step-by-step onboarding so non-technical animateurs can open and
 * install the app on a tablet in seconds. Shows the LAN URL (from the server)
 * so the QR works even when this page is opened on the organiser's PC.
 */
export const Access: React.FC = () => {
  const [baseUrl, setBaseUrl] = useState<string>(window.location.origin);
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Ask the server for the network URL tablets should use.
    api.getNetwork().then(setBaseUrl).catch(() => undefined);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    setInstallEvt(null);
  };

  return (
    <div className="app-container">
      <h1>📲 {t.tabletAccess}</h1>

      <div className="card">
        <div
          style={{
            background: 'white',
            padding: 24,
            borderRadius: 16,
            display: 'inline-block',
            margin: '4px auto 14px',
          }}
        >
          <QRCodeSVG value={baseUrl} size={240} />
        </div>
        <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)', wordBreak: 'break-all', margin: 0 }}>
          {baseUrl}
        </p>
      </div>

      <div className="card" style={{ textAlign: 'left' }}>
        <h2 style={{ textAlign: 'center' }}>{t.installSteps}</h2>
        <ol className="steps">
          <li>{t.step1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
        </ol>
        {installed ? (
          <p style={{ color: 'var(--success)', textAlign: 'center', fontWeight: 700 }}>✅ {t.appInstalled}</p>
        ) : (
          installEvt && (
            <button onClick={install} className="festive-button">
              <Download size={18} /> {t.installApp}
            </button>
          )
        )}
      </div>

      <Link to="/admin" className="festive-button" style={{ textDecoration: 'none', display: 'block', background: 'var(--secondary)', color: 'white' }}>
        ← {t.adminDashboard}
      </Link>
    </div>
  );
};
