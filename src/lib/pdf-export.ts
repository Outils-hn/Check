import type { jsPDF } from "jspdf";
import { LIBELLE, joursRetard, jourIso, type Statut } from "./notes";
import { installerPolicesPDF } from "./pdf-fonts";

/** Une note telle qu'imprimee : projet et personne deja en toutes lettres. */
export type NotePdf = { texte: string; projet: string; pour: string | null; statut: Statut; flash: boolean; created_at: string; echeance: string | null; regle_le: string | null; reponse?: string | null; images?: string[] };
export type OptionsPdf = { auteur?: string; filtres?: string; couleur?: boolean; imagesPdf?: Record<string, { data: string; w: number; h: number }> };

type Rgb = [number, number, number];
const NOIR: Rgb = [24, 24, 27];
const GRIS: Rgb = [113, 113, 122];
const TRAIT: Rgb = [228, 228, 231];
const ROUGE: Rgb = [185, 28, 28];
const INDIGO: Rgb = [67, 56, 202];
const VERT: Rgb = [22, 101, 52];
const STATUT_COULEURS: Record<string, { bg: Rgb; fg: Rgb }> = {
  todo: { bg: [254, 226, 226], fg: [153, 27, 27] },
  in_progress: { bg: [255, 237, 213], fg: [154, 52, 18] },
  waiting: { bg: [237, 233, 254], fg: [76, 29, 149] },
  done: { bg: [220, 252, 231], fg: [22, 101, 52] },
};

const fmtJour = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}.${m}.${y}`; };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CH");
/** Accorde un mot au singulier ou au pluriel selon le nombre (0 et 1 : singulier). */
const pl = (n: number, mot: string) => (n > 1 ? `${mot}s` : mot);
const plur = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Chiffres du bandeau et regroupement par projet (ordre alphabetique, « Perso » a la fin). */
export function resumeNotes(notes: NotePdf[], jour = jourIso()) {
  const enRetard = (n: NotePdf) => n.statut !== "done" && joursRetard(n.echeance, jour) > 0;
  const groupes = new Map<string, NotePdf[]>();
  for (const n of notes) groupes.set(n.projet, [...(groupes.get(n.projet) ?? []), n]);
  const noms = [...groupes.keys()].sort((a, b) => (a === "Perso" ? 1 : b === "Perso" ? -1 : a.localeCompare(b, "fr", { numeric: true })));
  return {
    total: notes.length,
    aTraiter: notes.filter((n) => n.statut !== "done").length,
    retard: notes.filter(enRetard).length,
    urgentes: notes.filter((n) => n.flash && n.statut !== "done").length,
    reglees: notes.filter((n) => n.statut === "done").length,
    groupes: noms.map((nom) => ({ nom, notes: groupes.get(nom)!, retard: groupes.get(nom)!.filter(enRetard).length })),
  };
}

type Ctx = { doc: jsPDF; W: number; H: number; mx: number; top: number; bottom: number };
type Resume = ReturnType<typeof resumeNotes>;

export async function exportNotesPdf(notes: NotePdf[], titre = "Rapport de suivi", opt: OptionsPdf = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await installerPolicesPDF(doc);
  const ctx: Ctx = { doc, W: doc.internal.pageSize.getWidth(), H: doc.internal.pageSize.getHeight(), mx: 48, top: 56, bottom: 56 };
  const jour = jourIso();
  const res = resumeNotes(notes, jour);
  const date = new Date().toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
  if (opt.couleur) rendreCouleur(ctx, res, titre, date, jour, opt);
  else rendreSobre(ctx, res, titre, date, jour, opt);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(opt.couleur ? "Check · outils-hn.github.io/Check" : "Check", ctx.mx, ctx.H - 28);
    doc.text(`Page ${i} / ${pages}`, ctx.W - ctx.mx, ctx.H - 28, { align: "right" });
  }
  const slug = titre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`check-${slug}-${new Date().toISOString().slice(0, 10)}${opt.couleur ? "-couleur" : ""}.pdf`);
}

/* ───────────── Version sobre (par defaut) : editoriale, noir et gris ───────────── */
function rendreSobre({ doc, W, H, mx, top, bottom }: Ctx, res: Resume, titre: string, date: string, jour: string, opt: OptionsPdf) {
  const cw = W - mx * 2;
  let y = top;
  doc.setFont("PlexSans", "bold"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text("CHECK", mx, y, { charSpace: 1.5 });
  doc.setFont("PlexSans", "normal");
  doc.text([date, opt.auteur].filter(Boolean).join(" · "), W - mx, y, { align: "right" });
  y += 30;
  doc.setFont("PlexSans", "bold"); doc.setFontSize(22); doc.setTextColor(...NOIR);
  doc.text(titre, mx, y);
  y += 16;
  if (opt.filtres) { doc.setFont("PlexSans", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(opt.filtres, cw), mx, y); y += 12; }
  y += 14;
  const chiffres: [number, string][] = [[res.total, pl(res.total, "note")], [res.aTraiter, "à traiter"], [res.retard, "en retard"], [res.urgentes, pl(res.urgentes, "urgente")], [res.reglees, pl(res.reglees, "réglée")]];
  const colW = cw / chiffres.length;
  chiffres.forEach(([v, l], i) => {
    doc.setFont("PlexSans", "bold"); doc.setFontSize(18); doc.setTextColor(...(l === "en retard" && v > 0 ? ROUGE : NOIR));
    doc.text(String(v), mx + i * colW, y);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text(l, mx + i * colW, y + 11);
  });
  y += 26;
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.8); doc.line(mx, y, W - mx, y);
  y += 22;

  const statW = 66, droiteW = 92, gap = 10;
  const texteW = cw - statW - droiteW - gap * 2;
  for (const g of res.groupes) {
    if (y + 60 > H - bottom) { doc.addPage(); y = top; }
    doc.setFont("PlexSans", "bold"); doc.setFontSize(11); doc.setTextColor(...NOIR);
    doc.text(g.nom, mx, y);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text(plur(g.notes.length, "note") + (g.retard ? ` · ${g.retard} en retard` : ""), W - mx, y, { align: "right" });
    y += 6;
    doc.setDrawColor(...TRAIT); doc.setLineWidth(0.5); doc.line(mx, y, W - mx, y);
    for (const n of g.notes) {
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10);
      const lignes: string[] = doc.splitTextToSize(n.texte, texteW);
      const nbImg = n.images?.length ?? 0;
      const sous = [n.pour ? `Pour ${n.pour}` : "", nbImg ? `${plur(nbImg, "image")} jointe${nbImg > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
      const rep: string[] = n.statut === "done" && n.reponse?.trim() ? doc.splitTextToSize(`Réponse : ${n.reponse.trim()}`, texteW) : [];
      const h = 10 + lignes.length * 13 + (sous ? 12 : 0) + rep.length * 12 + 8;
      if (y + h > H - bottom) { doc.addPage(); y = top; }
      const ty = y + 16;
      const urgent = n.flash && n.statut !== "done";
      doc.setFont("PlexSans", urgent ? "bold" : "normal"); doc.setFontSize(9); doc.setTextColor(...(urgent ? NOIR : GRIS));
      doc.text(urgent ? "urgent" : LIBELLE[n.statut].toLowerCase(), mx, ty);
      if (urgent) { doc.setFont("PlexSans", "normal"); doc.setTextColor(...GRIS); doc.text(LIBELLE[n.statut].toLowerCase(), mx, ty + 11); }
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10); doc.setTextColor(...NOIR);
      doc.text(lignes, mx + statW + gap, ty);
      let sy = ty + lignes.length * 13 - 1;
      doc.setFontSize(9); doc.setTextColor(...GRIS);
      if (sous) { doc.text(sous, mx + statW + gap, sy); sy += 12; }
      if (rep.length) { doc.setTextColor(...VERT); doc.text(rep, mx + statW + gap, sy); }
      const retard = n.statut !== "done" ? joursRetard(n.echeance, jour) : 0;
      doc.setFontSize(9);
      const dx = W - mx;
      if (n.statut === "done") { doc.setFont("PlexSans", "normal"); doc.setTextColor(...GRIS); doc.text(n.regle_le ? `réglée ${fmtDate(n.regle_le)}` : "réglée", dx, ty, { align: "right" }); }
      else if (n.echeance) {
        doc.setFont("PlexSans", retard ? "bold" : "normal"); doc.setTextColor(...(retard ? ROUGE : NOIR));
        doc.text(fmtJour(n.echeance), dx, ty, { align: "right" });
        if (retard) { doc.setFont("PlexSans", "normal"); doc.text(`en retard ${retard} j`, dx, ty + 11, { align: "right" }); }
      } else { doc.setFont("PlexSans", "normal"); doc.setTextColor(...GRIS); doc.text("sans échéance", dx, ty, { align: "right" }); }
      y += h;
      doc.setDrawColor(...TRAIT); doc.setLineWidth(0.4); doc.line(mx, y, W - mx, y);
    }
    y += 22;
  }
}

/* ───────────── Version en couleurs : bandeau indigo, cartes, pastilles ───────────── */
function rendreCouleur({ doc, W, H, mx, top, bottom }: Ctx, res: Resume, titre: string, date: string, jour: string, opt: OptionsPdf) {
  const cw = W - mx * 2;
  const badge = (txt: string, x: number, y: number, bg: Rgb, fg: Rgb) => {
    doc.setFont("PlexSans", "bold"); doc.setFontSize(8);
    const w = doc.getTextWidth(txt) + 12;
    doc.setFillColor(...bg); doc.roundedRect(x, y, w, 15, 3, 3, "F");
    doc.setTextColor(...fg); doc.text(txt, x + 6, y + 10.5);
    return w;
  };
  doc.setFillColor(...INDIGO); doc.rect(0, 0, W, 46, "F");
  doc.setFillColor(255, 255, 255); doc.roundedRect(mx, 11, 24, 24, 6, 6, "F");
  doc.setDrawColor(...INDIGO); doc.setLineWidth(2.4); doc.line(mx + 6.5, 23, mx + 10.5, 27.2); doc.line(mx + 10.5, 27.2, mx + 18, 18);
  doc.setFont("PlexSans", "bold"); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text("Check", mx + 33, 21.5);
  doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(199, 210, 254);
  doc.text("Bureau d'études · façade", mx + 33, 32);
  doc.setTextColor(255, 255, 255);
  doc.text(opt.auteur ? `Imprimé par ${opt.auteur}` : "Imprimé", W - mx, 21.5, { align: "right" });
  doc.setTextColor(199, 210, 254); doc.text(date, W - mx, 32, { align: "right" });
  let y = 84;
  doc.setFont("PlexSans", "bold"); doc.setFontSize(20); doc.setTextColor(...NOIR);
  doc.text(titre, mx, y);
  y += 15;
  if (opt.filtres) { doc.setFont("PlexSans", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS); doc.text(doc.splitTextToSize(opt.filtres, cw), mx, y); y += 12; }
  y += 10;
  const tuiles: [number, string, Rgb, Rgb][] = [
    [res.total, pl(res.total, "note"), [244, 244, 245], NOIR], [res.aTraiter, "à traiter", [238, 242, 255], INDIGO],
    [res.retard, "en retard", [254, 226, 226], [153, 27, 27]], [res.urgentes, pl(res.urgentes, "urgente"), [255, 237, 213], [154, 52, 18]], [res.reglees, pl(res.reglees, "réglée"), [220, 252, 231], VERT],
  ];
  const tw = (cw - 8 * 4) / 5;
  tuiles.forEach(([v, l, bg, fg], i) => {
    const x = mx + i * (tw + 8);
    doc.setFillColor(...bg); doc.roundedRect(x, y, tw, 44, 6, 6, "F");
    doc.setFont("PlexSans", "bold"); doc.setFontSize(17); doc.setTextColor(...fg); doc.text(String(v), x + 10, y + 21);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.text(l, x + 10, y + 34);
  });
  y += 70;

  const pad = 10;
  for (const g of res.groupes) {
    if (y + 80 > H - bottom) { doc.addPage(); y = top; }
    doc.setFont("PlexSans", "bold"); doc.setFontSize(12); doc.setTextColor(...NOIR); doc.text(g.nom, mx, y);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text(plur(g.notes.length, "note") + (g.retard ? ` · ${g.retard} en retard` : ""), W - mx, y, { align: "right" });
    y += 6; doc.setDrawColor(...INDIGO); doc.setLineWidth(1.2); doc.line(mx, y, W - mx, y);
    y += 10;
    for (const n of g.notes) {
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10.5);
      const lignes: string[] = doc.splitTextToSize(n.texte, cw - pad * 2);
      const infos = [n.pour ? `Pour ${n.pour}` : "", n.echeance && n.statut !== "done" ? `Échéance ${fmtJour(n.echeance)}` : "", n.statut === "done" && n.regle_le ? `Réglée le ${fmtDate(n.regle_le)}` : "", `Créée le ${fmtDate(n.created_at)}`].filter(Boolean).join("   ·   ");
      const rep: string[] = n.statut === "done" && n.reponse?.trim() ? doc.splitTextToSize(`Réponse : ${n.reponse.trim()}`, cw - pad * 4) : [];
      const imgs = (n.images ?? []).map((p) => opt.imagesPdf?.[p]).filter(Boolean) as { data: string; w: number; h: number }[];
      const imgH = imgs.length ? 52 : 0;
      const h = pad + 15 + 8 + lignes.length * 14 + 4 + 12 + (rep.length ? rep.length * 12 + 14 : 0) + (imgH ? imgH + 8 : 0) + pad;
      if (y + h > H - bottom) { doc.addPage(); y = top; }
      doc.setFillColor(255, 255, 255); doc.setDrawColor(...TRAIT); doc.setLineWidth(0.6); doc.roundedRect(mx, y, cw, h, 5, 5, "S");
      const urgent = n.flash && n.statut !== "done";
      if (urgent) { doc.setFillColor(249, 115, 22); doc.rect(mx, y + 4, 3, h - 8, "F"); }
      let cy = y + pad, cx = mx + pad;
      const sc = STATUT_COULEURS[n.statut];
      cx += badge(LIBELLE[n.statut], cx, cy, sc.bg, sc.fg) + 5;
      if (urgent) cx += badge("URGENT", cx, cy, [254, 215, 170], [154, 52, 18]) + 5;
      const retard = n.statut !== "done" ? joursRetard(n.echeance, jour) : 0;
      if (retard) badge(`En retard de ${retard} j`, cx, cy, [254, 226, 226], [153, 27, 27]);
      cy += 15 + 8;
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10.5); doc.setTextColor(...NOIR);
      doc.text(lignes, mx + pad, cy + 9);
      cy += lignes.length * 14 + 4;
      doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(infos, mx + pad, cy + 8);
      cy += 12;
      if (rep.length) {
        const rh = rep.length * 12 + 8;
        doc.setFillColor(240, 253, 244); doc.roundedRect(mx + pad, cy + 4, cw - pad * 2, rh, 3, 3, "F");
        doc.setFontSize(9.5); doc.setTextColor(...VERT); doc.text(rep, mx + pad + 8, cy + 4 + 12);
        cy += rh + 6;
      }
      if (imgH) {
        let ix = mx + pad; cy += 6;
        for (const im of imgs) {
          const w = Math.min(80, (im.w / im.h) * imgH);
          try { doc.addImage(im.data, "JPEG", ix, cy, w, (im.h / im.w) * w); } catch { /* image ignoree */ }
          ix += w + 6;
        }
      }
      y += h + 9;
    }
    y += 10;
  }
}

/** Feuille a emporter a l'atelier ou au montage : une case a cocher et deux lignes pour la reponse sous chaque question. */
export type TachePdf = { projet: string; tache: string; nom?: string; questions: (string | { texte: string; dest: string })[]; reglees?: { question: string; reponse: string }[] };

export async function exportQuestionsPdf(taches: TachePdf[], opt: { auteur?: string; titre?: string } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await installerPolicesPDF(doc);
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), mx = 48, top = 56, bottom = 56, cw = W - mx * 2;
  const date = new Date().toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
  let y = top;
  doc.setFont("PlexSans", "bold"); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text("CHECK", mx, y, { charSpace: 1.5 });
  doc.setFont("PlexSans", "normal");
  doc.text([date, opt.auteur].filter(Boolean).join(" · "), W - mx, y, { align: "right" });
  y += 30;
  doc.setFont("PlexSans", "bold"); doc.setFontSize(20); doc.setTextColor(...NOIR);
  doc.text(opt.titre ?? "Questions Tâches", mx, y);
  y += 30;
  for (const t of taches) {
    if (y + 90 > H - bottom) { doc.addPage(); y = top; }
    doc.setFont("PlexSans", "bold"); doc.setFontSize(12); doc.setTextColor(...NOIR);
    const titre = (t.tache ? `Tâche ${t.tache}` : "Sans numéro de tâche") + (t.nom ? ` · ${t.nom}` : "");
    doc.text(titre, mx, y);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS);
    doc.text(t.projet, W - mx, y, { align: "right" });
    y += 6;
    doc.setDrawColor(...NOIR); doc.setLineWidth(0.8); doc.line(mx, y, W - mx, y);
    y += 20;
    for (const qu of t.questions) {
      const q = typeof qu === "string" ? qu : qu.texte;
      const dest = typeof qu === "string" ? "" : qu.dest;
      doc.setFont("PlexSans", "bold"); doc.setFontSize(11);
      const lignes: string[] = doc.splitTextToSize(q, cw - 24);
      const h = lignes.length * 14 + 24 + 12 + (dest ? 11 : 0);
      if (y + h > H - bottom) { doc.addPage(); y = top; }
      if (dest) { doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(dest.toUpperCase(), mx + 24, y - 1, { charSpace: 0.8 }); y += 11; doc.setFont("PlexSans", "bold"); doc.setFontSize(11); }
      doc.setDrawColor(...NOIR); doc.setLineWidth(1); doc.rect(mx, y - 9, 10, 10);
      doc.setTextColor(...NOIR); doc.text(lignes, mx + 24, y);
      let ly = y + (lignes.length - 1) * 14 + 22; // une seule ligne pour la reponse manuscrite
      doc.setDrawColor(...GRIS); doc.setLineWidth(0.4);
      doc.line(mx + 24, ly, W - mx, ly); ly += 2;
      y = ly + 4;
    }
    // Questions deja reglees : case cochee, la reponse prend la place des lignes
    for (const r of t.reglees ?? []) {
      doc.setFont("PlexSans", "bold"); doc.setFontSize(11);
      const lignes: string[] = doc.splitTextToSize(r.question, cw - 24);
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10);
      const rep: string[] = r.reponse.trim() ? doc.splitTextToSize(`Réponse : ${r.reponse.trim()}`, cw - 24) : [];
      const h = lignes.length * 14 + rep.length * 13 + 14;
      if (y + h > H - bottom) { doc.addPage(); y = top; }
      doc.setDrawColor(...NOIR); doc.setLineWidth(1); doc.rect(mx, y - 9, 10, 10);
      doc.line(mx + 2, y - 4, mx + 4.5, y - 1); doc.line(mx + 4.5, y - 1, mx + 8.5, y - 8);
      doc.setFont("PlexSans", "bold"); doc.setFontSize(11); doc.setTextColor(...GRIS); doc.text(lignes, mx + 24, y);
      doc.setFont("PlexSans", "normal"); doc.setFontSize(10); doc.setTextColor(...VERT);
      if (rep.length) doc.text(rep, mx + 24, y + lignes.length * 14);
      y += h + 6;
    }
    y += 14;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("PlexSans", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text("Check", mx, H - 28);
    doc.text(`Page ${i} / ${pages}`, W - mx, H - 28, { align: "right" });
  }
  doc.save(`check-questions-taches-${new Date().toISOString().slice(0, 10)}.pdf`);
}
