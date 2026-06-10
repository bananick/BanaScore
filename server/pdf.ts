import PDFDocument from 'pdfkit';
import type { EventReport } from './store';
import type { WorkshopRanking } from './types';

const GOLD = '#b8860b';
const DARK = '#222222';
const LIGHT = '#666666';
const MEDALS = ['1er', '2e', '3e'];

/** Standard competition ranking ("1,2,2,4") from scores sorted desc. */
function ranks(scores: number[]): number[] {
  const out: number[] = [];
  let last: number | null = null;
  let lastRank = 0;
  scores.forEach((s, i) => {
    if (last === null || s !== last) {
      lastRank = i + 1;
      last = s;
    }
    out.push(lastRank);
  });
  return out;
}

const medal = (rank: number) => (rank <= 3 ? `${MEDALS[rank - 1]} ` : `#${rank} `);

/**
 * Build a client-ready PDF report and pipe it into `res`. Layout: header +
 * general ranking + per-activity breakdown + top 3 per atelier.
 */
export function streamReportPdf(
  report: EventReport,
  workshops: WorkshopRanking[],
  res: NodeJS.WritableStream,
): void {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  // --- Header ---
  doc.fillColor(GOLD).fontSize(22).font('Helvetica-Bold').text(report.event.name, { align: 'center' });
  const meta = [report.event.date, report.event.location].filter(Boolean).join('  •  ');
  if (meta) doc.moveDown(0.2).fillColor(DARK).fontSize(11).font('Helvetica').text(meta, { align: 'center' });
  doc
    .moveDown(0.2)
    .fillColor(LIGHT)
    .fontSize(9)
    .text(
      `BanaScore — Banana Events  •  ${report.participantCount} participant(s)  •  généré le ${new Date(
        report.generatedAt,
      ).toLocaleString('fr-FR')}`,
      { align: 'center' },
    );
  if (report.rankingMode === 'normalized') {
    doc
      .moveDown(0.2)
      .fillColor(GOLD)
      .fontSize(8)
      .text(
        'Total = classement general normalise par atelier (chaque atelier a poids egal sauf ponderation).',
        { align: 'center' },
      );
  }
  doc.moveDown(0.6);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
  doc.moveDown(0.8);

  const teamRanks = ranks(report.teams.map((t) => t.total));

  // --- General ranking ---
  sectionTitle(doc, 'Classement général');
  drawTable(
    doc,
    ['Rang', 'Équipe', 'Total'],
    report.teams.map((t, i) => [medal(teamRanks[i]), t.name, String(t.total)]),
    [60, width - 60 - 70, 70],
    [{ align: 'left' }, { align: 'left' }, { align: 'right' }],
  );

  // --- Per-activity breakdown (only if it fits comfortably) ---
  if (report.activities.length > 0 && report.activities.length <= 8) {
    doc.moveDown(0.8);
    sectionTitle(doc, 'Détail par activité');
    const actLabel = (a: { name: string; coefficient: number }) =>
      a.coefficient !== 1 ? `${a.name} (x${a.coefficient})` : a.name;
    const headers = ['Équipe', ...report.activities.map(actLabel), 'Votes', 'Bonus', 'Total'];
    const teamCol = 110;
    const otherCols = report.activities.length + 3;
    const colW = (width - teamCol) / otherCols;
    const widths = [teamCol, ...Array(otherCols).fill(colW)];
    const aligns = [
      { align: 'left' as const },
      ...Array(otherCols).fill({ align: 'right' as const }),
    ];
    const rows = report.teams.map((t) => [
      t.name,
      ...report.activities.map((a) => String(t.activityPoints[a.id] || '·')),
      String(t.votes),
      String(t.bonus),
      String(t.total),
    ]);
    drawTable(doc, headers, rows, widths, aligns, 8);
  }

  // --- Top 3 per atelier ---
  const meaningful = workshops.filter((w) => w.ranking.some((r) => r.score > 0));
  if (meaningful.length > 0) {
    doc.moveDown(0.8);
    sectionTitle(doc, 'Top 3 par atelier');
    for (const w of meaningful) {
      ensureSpace(doc, 70);
      doc.fillColor(GOLD).fontSize(12).font('Helvetica-Bold').text(w.workshop);
      const wr = ranks(w.ranking.map((r) => r.score));
      doc.fillColor(DARK).fontSize(10).font('Helvetica');
      w.ranking.slice(0, 3).forEach((entry, i) => {
        doc.text(`   ${medal(wr[i])}${entry.name} — ${entry.score} pts`);
      });
      doc.moveDown(0.4);
    }
  }

  doc.end();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 40);
  doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

type Align = { align: 'left' | 'right' | 'center' };

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  widths: number[],
  aligns: Align[],
  fontSize = 10,
): void {
  const left = doc.page.margins.left;
  const rowH = fontSize + 8;

  const renderRow = (cells: string[], bold: boolean, fill?: string) => {
    ensureSpace(doc, rowH);
    const y = doc.y;
    if (fill) {
      const total = widths.reduce((a, b) => a + b, 0);
      doc.rect(left, y - 2, total, rowH).fill(fill);
    }
    let x = left;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(DARK);
    cells.forEach((cell, i) => {
      doc.text(cell, x + 3, y + 2, { width: widths[i] - 6, align: aligns[i].align, lineBreak: false });
      x += widths[i];
    });
    doc.y = y + rowH;
    doc.moveTo(left, doc.y).lineTo(left + widths.reduce((a, b) => a + b, 0), doc.y)
      .strokeColor('#dddddd').lineWidth(0.5).stroke();
  };

  renderRow(headers, true, '#f3e9c6');
  rows.forEach((r, i) => renderRow(r, false, i === 0 ? '#fff7d6' : undefined));
}
