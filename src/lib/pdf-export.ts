import { jsPDF } from "jspdf";
import { Note, STATUS_LABEL } from "./notes-storage";

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const STATUS_COLORS: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
  todo: { bg: [254, 226, 226], fg: [153, 27, 27] }, // red light
  in_progress: { bg: [255, 237, 213], fg: [154, 52, 18] }, // orange light
  waiting: { bg: [237, 233, 254], fg: [76, 29, 149] }, // violet light
  done: { bg: [220, 252, 231], fg: [22, 101, 52] }, // green light
};

export function exportNotesPdf(notes: Note[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 48;
  const contentW = pageW - marginX * 2;

  const navy: [number, number, number] = [30, 41, 59]; // slate-800
  const slate: [number, number, number] = [100, 116, 139]; // slate-500
  const lineGray: [number, number, number] = [226, 232, 240]; // slate-200

  let y = marginTop;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...navy);
  doc.text("RAPPORT DE SUIVI DE CHANTIER", marginX, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...slate);
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(`Date : ${today}`, marginX, y);
  doc.text(
    `${notes.length} note${notes.length > 1 ? "s" : ""}`,
    pageW - marginX,
    y,
    { align: "right" },
  );
  y += 12;

  doc.setDrawColor(...lineGray);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 18;

  // Notes as cards
  doc.setFontSize(11);

  const cardPadX = 12;
  const cardPadY = 10;
  const badgeH = 16;
  const lineH = 14;

  for (const n of notes) {
    // Measure body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(n.text, contentW - cardPadX * 2);
    const dueLine = n.dueDate ? `Échéance : ${fmtDue(n.dueDate)}` : null;
    const innerH =
      badgeH +
      8 +
      wrapped.length * lineH +
      (dueLine ? lineH + 4 : 0);
    const cardH = innerH + cardPadY * 2;

    // page-break-inside: avoid
    if (y + cardH > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }

    // Card border
    doc.setDrawColor(...lineGray);
    doc.setLineWidth(0.5);
    doc.roundedRect(marginX, y, contentW, cardH, 4, 4, "S");

    let cx = marginX + cardPadX;
    let cy = y + cardPadY;

    // Category badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const catLabel = n.category;
    const catW = doc.getTextWidth(catLabel) + 12;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(...lineGray);
    doc.roundedRect(cx, cy, catW, badgeH, 3, 3, "FD");
    doc.setTextColor(...navy);
    doc.text(catLabel, cx + 6, cy + 11);

    // Status badge
    const sx = cx + catW + 6;
    const sLabel = STATUS_LABEL[n.status];
    const sW = doc.getTextWidth(sLabel) + 12;
    const sc = STATUS_COLORS[n.status];
    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.bg);
    doc.roundedRect(sx, cy, sW, badgeH, 3, 3, "F");
    doc.setTextColor(...sc.fg);
    doc.text(sLabel, sx + 6, cy + 11);

    // Created date (right)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    const created = new Date(n.createdAt).toLocaleDateString("fr-FR");
    doc.text(`Créée le ${created}`, marginX + contentW - cardPadX, cy + 11, {
      align: "right",
    });

    cy += badgeH + 8;

    // Body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(wrapped, cx, cy + 10);
    cy += wrapped.length * lineH;

    // Due line
    if (dueLine) {
      cy += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...slate);
      doc.text(dueLine, cx, cy + 10);
    }

    y += cardH + 10;
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 24, {
      align: "right",
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`rapport-chantier-${stamp}.pdf`);
}
