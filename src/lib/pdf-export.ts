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

const STATUS_COLORS: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
  todo: { bg: [254, 226, 226], fg: [153, 27, 27] },
  in_progress: { bg: [219, 234, 254], fg: [30, 64, 175] },
  waiting: { bg: [237, 233, 254], fg: [76, 29, 149] },
  done: { bg: [220, 252, 231], fg: [22, 101, 52] },
};

export function exportNotesPdf(notes: Note[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginTop = 44;
  const marginBottom = 44;
  const contentW = pageW - marginX * 2;

  const navy: [number, number, number] = [15, 23, 42];
  const slate: [number, number, number] = [100, 116, 139];
  const lineGray: [number, number, number] = [241, 245, 249];
  const cardBorder: [number, number, number] = [226, 232, 240];
  const orange: [number, number, number] = [249, 115, 22];
  const red: [number, number, number] = [220, 38, 38];
  const green: [number, number, number] = [22, 101, 52];

  const activeNotes = notes.filter((n) => n.status !== "done");
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const drawHeader = () => {
    let y = marginTop;

    // Logo square with orange check
    const logoSize = 30;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, y, logoSize, logoSize, 5, 5, "FD");
    // orange check
    doc.setDrawColor(...orange);
    doc.setLineWidth(2.4);
    doc.line(marginX + 8, y + 16, marginX + 13, y + 21);
    doc.line(marginX + 13, y + 21, marginX + 23, y + 10);
    doc.setLineWidth(0.5);

    // CHECK title + subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...navy);
    doc.text("CHECK", marginX + logoSize + 10, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text("Notes & taches techniques", marginX + logoSize + 10, y + 26);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.text("RAPPORT DE SUIVI DE CHANTIER", pageW - marginX, y + 12, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(
      `Date : ${today}  •  ${activeNotes.length} note${activeNotes.length > 1 ? "s" : ""} active${activeNotes.length > 1 ? "s" : ""}`,
      pageW - marginX,
      y + 26,
      { align: "right" },
    );

    y += logoSize + 10;
    doc.setDrawColor(...lineGray);
    doc.setLineWidth(0.8);
    doc.line(marginX, y, pageW - marginX, y);
    return y + 16;
  };

  let y = drawHeader();

  const cardPadX = 14;
  const cardPadY = 12;
  const badgeH = 16;
  const lineH = 14;
  const rightColW = 150;
  const gutter = 12;

  for (const n of notes) {
    const leftColW = contentW - cardPadX * 2 - rightColW - gutter;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(n.text, leftColW);

    const dueLine =
      n.status !== "done" && n.dueDate ? `Echeance : ${fmtDate(n.dueDate)}` : null;
    const doneLine =
      n.status === "done" && n.completedAt
        ? `Reglee le ${fmtTs(n.completedAt)}`
        : null;

    const leftH = badgeH + 10 + wrapped.length * lineH;
    const rightLines = 1 + (dueLine ? 1 : 0) + (doneLine ? 1 : 0);
    const rightH = rightLines * lineH;
    const innerH = Math.max(leftH, rightH);
    const cardH = innerH + cardPadY * 2;

    if (y + cardH > pageH - marginBottom) {
      doc.addPage();
      y = drawHeader();
    }

    // Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.6);
    doc.roundedRect(marginX, y, contentW, cardH, 5, 5, "FD");

    if (n.flash) {
      doc.setFillColor(...orange);
      doc.rect(marginX, y, 4, cardH, "F");
    }

    const cx = marginX + cardPadX;
    let cy = y + cardPadY;

    // Badges
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const catLabel = n.category;
    const catW = doc.getTextWidth(catLabel) + 12;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cy, catW, badgeH, 3, 3, "FD");
    doc.setTextColor(...navy);
    doc.text(catLabel, cx + 6, cy + 11);

    const sx = cx + catW + 6;
    const sLabel = STATUS_LABEL[n.status];
    const sW = doc.getTextWidth(sLabel) + 12;
    const sc = STATUS_COLORS[n.status] ?? { bg: [241, 245, 249] as [number, number, number], fg: [30, 41, 59] as [number, number, number] };
    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.bg);
    doc.roundedRect(sx, cy, sW, badgeH, 3, 3, "F");
    doc.setTextColor(...sc.fg);
    doc.text(sLabel, sx + 6, cy + 11);

    if (n.flash) {
      const fx = sx + sW + 6;
      const fLabel = "URGENT";
      const fW = doc.getTextWidth(fLabel) + 12;
      doc.setFillColor(...orange);
      doc.setDrawColor(...orange);
      doc.roundedRect(fx, cy, fW, badgeH, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(fLabel, fx + 6, cy + 11);
    }

    // Body text
    cy += badgeH + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(wrapped, cx, cy);

    // Right column dates
    const rx = marginX + contentW - cardPadX;
    let ry = y + cardPadY + 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(`Creee le : ${fmtTs(n.createdAt)}`, rx, ry, { align: "right" });

    if (dueLine) {
      ry += lineH;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...red);
      doc.text(dueLine, rx, ry, { align: "right" });
    }
    if (doneLine) {
      ry += lineH;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...green);
      doc.text(doneLine, rx, ry, { align: "right" });
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
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 20, {
      align: "right",
    });
    doc.text("CHECK — Rapport de suivi", marginX, pageH - 20);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`rapport-chantier-${stamp}.pdf`);
}
