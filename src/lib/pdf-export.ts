import { jsPDF } from "jspdf";
import { Note, STATUS_LABEL } from "./notes-storage";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtTs(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR");
}

export function exportNotesPdf(notes: Note[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginTop = 48;
  const marginBottom = 56;
  const contentW = pageW - marginX * 2;

  const ink: [number, number, number] = [30, 41, 59];        // #1e293b
  const navy: [number, number, number] = [15, 23, 42];
  const slate: [number, number, number] = [100, 116, 139];   // #64748b
  const mute: [number, number, number] = [148, 163, 184];    // #94a3b8
  const hair: [number, number, number] = [241, 245, 249];    // #f1f5f9
  const border: [number, number, number] = [226, 232, 240];  // #e2e8f0
  const orange: [number, number, number] = [234, 88, 12];    // #ea580c
  const forest: [number, number, number] = [21, 128, 61];    // #15803d green-700
  const brick: [number, number, number] = [185, 28, 28];     // #b91c1c red-700

  const activeNotes = notes.filter((n) => n.status !== "done");
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const drawHeader = () => {
    let y = marginTop;

    // Small logo mark
    const logoSize = 26;
    doc.setDrawColor(...orange);
    doc.setLineWidth(1.6);
    doc.roundedRect(marginX, y, logoSize, logoSize, 4, 4);
    doc.setLineWidth(2);
    doc.line(marginX + 7, y + 14, marginX + 12, y + 19);
    doc.line(marginX + 12, y + 19, marginX + 20, y + 9);
    doc.setLineWidth(0.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...navy);
    doc.text("CHECK", marginX + logoSize + 10, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...mute);
    doc.text("RAPPORT DE SUIVI", marginX + logoSize + 10, y + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(today, pageW - marginX, y + 12, { align: "right" });
    doc.setTextColor(...mute);
    doc.text(
      `${activeNotes.length} note${activeNotes.length > 1 ? "s" : ""} active${activeNotes.length > 1 ? "s" : ""}`,
      pageW - marginX,
      y + 23,
      { align: "right" },
    );

    y += logoSize + 18;
    doc.setDrawColor(...border);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageW - marginX, y);
    return y + 24;
  };

  let y = drawHeader();

  const rowPadY = 20;
  const rightColW = 170;
  const gutter = 20;
  const leftColW = contentW - rightColW - gutter;
  const lineH = 13;

  for (const n of notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    const wrapped = doc.splitTextToSize(n.text, leftColW);

    const dueLine =
      n.status !== "done" && n.dueDate ? `Echeance : ${fmtDate(n.dueDate)}` : null;
    const doneLine =
      n.status === "done" && n.completedAt
        ? `Reglee le ${fmtTs(n.completedAt)}`
        : null;

    const badgeH = 14;
    const bodyH = wrapped.length * (lineH + 1);
    const leftH = badgeH + 12 + bodyH;
    const rightH = lineH + (dueLine ? lineH : 0) + (doneLine ? lineH : 0);
    const rowH = Math.max(leftH, rightH) + rowPadY * 2;

    if (y + rowH > pageH - marginBottom) {
      doc.addPage();
      y = drawHeader();
    }

    const cx = marginX;
    let cy = y + rowPadY;

    // Category badge — light and airy
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const catLabel = n.category;
    const catW = doc.getTextWidth(catLabel) + 12;
    doc.setFillColor(250, 250, 251);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, cy, catW, badgeH, 2, 2, "FD");
    doc.setTextColor(...slate);
    doc.text(catLabel, cx + 6, cy + 9.5);

    // Status label — plain text, no fill
    let sx = cx + catW + 10;
    const sLabel = STATUS_LABEL[n.status];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...mute);
    doc.text(sLabel.toUpperCase(), sx, cy + 9.5);
    const sW = doc.getTextWidth(sLabel.toUpperCase());

    // Flash: small lightning glyph
    if (n.flash) {
      const fx = sx + sW + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...orange);
      doc.text("URGENT", fx, cy + 9.5);
    }

    // Body text — normal weight, ink color
    cy += badgeH + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...ink);
    for (let i = 0; i < wrapped.length; i++) {
      doc.text(wrapped[i], cx, cy + i * (lineH + 1));
    }

    // Right column — dates
    const rx = marginX + contentW;
    let ry = y + rowPadY + 9.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...mute);
    doc.text(`Creee le ${fmtTs(n.createdAt)}`, rx, ry, { align: "right" });

    if (dueLine) {
      ry += lineH + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...brick);
      doc.text(dueLine, rx, ry, { align: "right" });
    }
    if (doneLine) {
      ry += lineH + 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...forest);
      doc.text(doneLine, rx, ry, { align: "right" });
    }

    // Flash: thin orange accent line at left
    if (n.flash) {
      doc.setDrawColor(...orange);
      doc.setLineWidth(2);
      doc.line(marginX - 12, y + rowPadY, marginX - 12, y + rowH - rowPadY);
      doc.setLineWidth(0.5);
    }

    // Separator
    y += rowH;
    doc.setDrawColor(...hair);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageW - marginX, y);
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...mute);
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 24, {
      align: "right",
    });
    doc.text("CHECK", marginX, pageH - 24);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`rapport-chantier-${stamp}.pdf`);
}
