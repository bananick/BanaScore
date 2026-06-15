import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText, Printer } from 'lucide-react';
import * as api from '../api';
import type { EventReport as Report, WorkshopRanking } from '../types';
import { t } from '../i18n';
import { useToast } from '../toast';
import { computeRanks, hasRanking } from '../ranks';
import { RankIcon } from '../components/RankIcon';

const activityLabel = (a: { name: string; coefficient: number }) =>
  a.coefficient !== 1 ? `${a.name} (×${a.coefficient})` : a.name;

function toCsv(report: Report): string {
  const ranks = computeRanks(report.teams.map((t) => t.total));
  const head = [t.rank, t.team, ...report.activities.map(activityLabel), t.votesCol, t.bonusCol, t.totalCol];
  const rows = report.teams.map((team, i) => [
    String(ranks[i]),
    team.name,
    ...report.activities.map((a) => String(team.activityPoints[a.id] ?? 0)),
    String(team.votes),
    team.bonusLabel ? `${team.bonus} (${team.bonusLabel})` : String(team.bonus),
    String(team.total),
  ]);
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function download(filename: string, content: string, mime: string) {
  downloadBlob(filename, new Blob(['﻿' + content], { type: mime }));
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'evenement';

export const EventReport: React.FC = () => {
  const { id } = useParams();
  const toast = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopRanking[]>([]);

  useEffect(() => {
    api
      .getReport(id!)
      .then(setReport)
      .catch((err) => toast.error(api.apiErrorMessage(err)));
    api
      .rankingWorkshops(id!)
      .then(setWorkshops)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!report) {
    return (
      <div className="app-container">
        <p>…</p>
      </div>
    );
  }

  const { event, activities, teams } = report;
  const generated = new Date(report.generatedAt).toLocaleString('fr-FR');
  const exportCsv = () => download(`banascore-${slug(event.name)}.csv`, toCsv(report), 'text/csv;charset=utf-8');
  const exportPdf = async () => {
    try {
      downloadBlob(`banascore-${slug(event.name)}.pdf`, await api.downloadReportPdf(id!));
    } catch (err) {
      toast.error(api.apiErrorMessage(err));
    }
  };
  const ranks = computeRanks(teams.map((tm) => tm.total));
  const ranked = hasRanking(teams.map((tm) => tm.total));
  const brandStyle = event.brand_color
    ? ({ ['--primary']: event.brand_color } as React.CSSProperties)
    : undefined;

  return (
    <div className="app-container report" style={brandStyle}>
      <div className="report-actions no-print">
        <Link to={`/admin/event/${id}`} style={{ color: 'white' }}>
          ← {t.eventManagement}
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportPdf} className="festive-button" style={{ width: 'auto', marginTop: 0 }}>
            <FileText size={16} /> {t.downloadPdf}
          </button>
          <button
            onClick={exportCsv}
            className="festive-button"
            style={{ width: 'auto', marginTop: 0, background: 'var(--success)', color: 'white' }}
          >
            <Download size={16} /> {t.exportCsv}
          </button>
          <button
            onClick={() => window.print()}
            className="festive-button"
            style={{ width: 'auto', marginTop: 0, background: 'var(--blue)', color: 'white' }}
          >
            <Printer size={16} /> {t.print}
          </button>
        </div>
      </div>

      <header className="report-header">
        {event.logo_url ? (
          <img src={event.logo_url} alt="" className="report-logo" />
        ) : (
          <div className="report-brand">🍌 BanaScore · Banana Events</div>
        )}
        <h1 style={{ fontSize: '2rem', margin: '8px 0' }}>{event.name}</h1>
        <p style={{ opacity: 0.8, margin: 0 }}>
          {[event.date, event.location].filter(Boolean).join(' · ')}
        </p>
        <p style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: 4 }}>
          {t.clientReport} — {t.generatedOn} {generated} · {report.participantCount} {t.participants}
        </p>
      </header>

      {teams.length === 0 ? (
        <p>{t.noData}</p>
      ) : (
        <>
          <div className="podium no-print">
            {teams.slice(0, 3).map((team, i) => (
              <div key={team.id} className={`podium-spot podium-${i + 1}`}>
                <div className="podium-medal">
                  {ranked && team.total > 0 ? <RankIcon rank={ranks[i]} size={30} /> : null}
                </div>
                <div className="podium-name">{team.name}</div>
                <div className="podium-score">
                  {team.total} {t.pts}
                </div>
              </div>
            ))}
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th>{t.rank}</th>
                <th style={{ textAlign: 'left' }}>{t.team}</th>
                {activities.map((a) => (
                  <th key={a.id}>{activityLabel(a)}</th>
                ))}
                <th>{t.votesCol}</th>
                <th>{t.bonusCol}</th>
                <th>{t.totalCol}</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, i) => (
                <tr key={team.id} className={ranked && ranks[i] === 1 && team.total > 0 ? 'is-first' : ''}>
                  <td>
                    {ranked && ranks[i] <= 3 && team.total > 0 ? <RankIcon rank={ranks[i]} /> : null}
                  </td>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>{team.name}</td>
                  {activities.map((a) => (
                    <td key={a.id}>{team.activityPoints[a.id] || '·'}</td>
                  ))}
                  <td>{team.votes}</td>
                  <td title={team.bonusLabel ?? undefined}>
                    {team.bonus}
                    {team.bonusLabel ? <span className="bonus-label"> · {team.bonusLabel}</span> : null}
                  </td>
                  <td>
                    <strong>{team.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {workshops.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: '1.3rem' }}>
                🏅 {t.top3} — {t.workshopRankingsShort}
              </h2>
              <div className="workshops-report">
                {workshops.map((w) => {
                  const top = w.ranking.slice(0, 3);
                  const ranks = computeRanks(w.ranking.map((r) => r.score)).slice(0, 3);
                  return (
                    <div key={w.workshop} className="workshop-block">
                      <h3>{w.workshop}</h3>
                      {top.every((e) => e.score === 0) ? (
                        <p style={{ opacity: 0.6, margin: 0 }}>{t.noData}</p>
                      ) : (
                        top.map((entry, i) => (
                          <div key={entry.id} className="workshop-row">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {entry.score > 0 ? <RankIcon rank={ranks[i]} size={18} /> : null}{' '}
                              {entry.name}
                            </span>
                            <strong>
                              {entry.score} {t.pts}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
