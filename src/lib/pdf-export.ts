import { LIBELLE, type Statut } from "./notes";
import { installerPolicesPDF } from "./pdf-fonts";

/** Une note telle qu'imprimee : projet et personne deja en toutes lettres. */
export type NotePdf = { texte: string; projet: string; pour: string | null; statut: Statut; flash: boolean; created_at: string; echeance: string | null; regle_le: string | null };

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const STATUS_COLORS: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
  todo: { bg: [254, 226, 226], fg: [153, 27, 27] }, // red light
  in_progress: { bg: [255, 237, 213], fg: [154, 52, 18] }, // orange light
  waiting: { bg: [237, 233, 254], fg: [76, 29, 149] }, // violet light
  done: { bg: [220, 252, 231], fg: [22, 101, 52] }, // green light
};

export async function exportNotesPdf(notes: NotePdf[], titre = "Rapport de suivi") {
  // jsPDF ne se charge qu'au premier export : demarrage plus leger
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  // Police livree avec l'appli : accents corrects (« Créée », « Échéance »)
  await installerPolicesPDF(doc);
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
  doc.setFont("PlexSans", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...navy);
  doc.text(titre, marginX, y);
  y += 18;

  doc.setFont("PlexSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...slate);
  const today = new Date().toLocaleDateString("fr-CH", {
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
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(n.texte, contentW - cardPadX * 2);
    const dueLine =
      n.statut !== "done" && n.echeance ? `Échéance : ${fmtDue(n.echeance)}` : null;
    const doneLine =
      n.statut === "done" && n.regle_le
        ? `Réglée le ${new Date(n.regle_le).toLocaleDateString("fr-CH")}`
        : null;
    const pourLigne = n.pour ? `Pour : ${n.pour}` : null;
    const extraLines = (dueLine ? 1 : 0) + (doneLine ? 1 : 0) + (pourLigne ? 1 : 0);
    const innerH =
      badgeH +
      8 +
      wrapped.length * lineH +
      (extraLines > 0 ? extraLines * lineH + 4 : 0);
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

    // Flash left border indicator
    if (n.flash) {
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(3);
      doc.line(marginX, y, marginX, y + cardH);
      doc.setLineWidth(0.5);
    }

    let cx = marginX + cardPadX;
    let cy = y + cardPadY;

    // Category badge
    doc.setFont("PlexSans", "bold");
    doc.setFontSize(9);
    const catLabel = n.projet;
    const catW = doc.getTextWidth(catLabel) + 12;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(...lineGray);
    doc.roundedRect(cx, cy, catW, badgeH, 3, 3, "FD");
    doc.setTextColor(...navy);
    doc.text(catLabel, cx + 6, cy + 11);

    // Status badge
    let sx = cx + catW + 6;
    const sLabel = LIBELLE[n.statut];
    const sW = doc.getTextWidth(sLabel) + 12;
    const sc = STATUS_COLORS[n.statut] ?? { bg: [241, 245, 249] as [number, number, number], fg: [30, 41, 59] as [number, number, number] };
    doc.setFillColor(...sc.bg);
    doc.setDrawColor(...sc.bg);
    doc.roundedRect(sx, cy, sW, badgeH, 3, 3, "F");
    doc.setTextColor(...sc.fg);
    doc.text(sLabel, sx + 6, cy + 11);

    // Flash badge
    if (n.flash) {
      const fx = sx + sW + 6;
      const fLabel = "URGENT";
      const fW = doc.getTextWidth(fLabel) + 12;
      doc.setFillColor(254, 215, 170);
      doc.setDrawColor(254, 215, 170);
      doc.roundedRect(fx, cy, fW, badgeH, 3, 3, "F");
      doc.setTextColor(154, 52, 18);
      doc.text(fLabel, fx + 6, cy + 11);
    }

    // Created date (right)
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    const created = new Date(n.created_at).toLocaleDateString("fr-CH");
    doc.text(`Créée le ${created}`, marginX + contentW - cardPadX, cy + 11, {
      align: "right",
    });

    cy += badgeH + 8;

    // Body text
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(wrapped, cx, cy + 10);
    cy += wrapped.length * lineH;

    // Due / done lines
    if (pourLigne) {
      cy += 4;
      doc.setFont("PlexSans", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...slate);
      doc.text(pourLigne, cx, cy + 10);
      cy += lineH;
    }
    if (dueLine) {
      cy += 4;
      doc.setFont("PlexSans", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...slate);
      doc.text(dueLine, cx, cy + 10);
      cy += lineH;
    }
    if (doneLine) {
      cy += 4;
      doc.setFont("PlexSans", "normal");
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52);
      doc.text(doneLine, cx, cy + 10);
    }

    y += cardH + 10;
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("PlexSans", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(`Page ${i} / ${pages}`, pageW - marginX, pageH - 24, {
      align: "right",
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`check-${titre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${stamp}.pdf`);
}
