import { describe, expect, it } from "vitest";
import { PERSO, aNettoyer, etatEcheance, filtrer, nomProjet, ordreAvant, ordreEnTete, suivant, type Filtres, type Note } from "./notes";
import { choixParDefaut, exporter, lireAnciennes, planImport } from "./reprise";

const moi = "u-moi", autre = "u-marc";
const base = (p: Partial<Note>): Note => ({
  id: "x", projet_id: null, auteur: moi, pour: null, texte: "", statut: "todo", echeance: null, flash: false, archive: false,
  ordre: 0, regle_le: null, supprime_le: null, created_at: "2026-10-20T08:00:00Z", ...p,
});
const notes: Note[] = [
  base({ id: "a", texte: "Relancer Schüco pour l'imposte", projet_id: "p1", pour: moi, echeance: "2026-10-30", ordre: 2 }),
  base({ id: "b", texte: "Liste de fabrication indice B", projet_id: "p1", pour: autre, statut: "in_progress", ordre: 1, created_at: "2026-10-25T08:00:00Z" }),
  base({ id: "c", texte: "Rendez-vous garage", ordre: 3 }),
  base({ id: "d", texte: "Commande envoyée", projet_id: "p1", statut: "done", regle_le: "2026-10-01T08:00:00Z", ordre: 4 }),
  base({ id: "e", texte: "Archivée", archive: true }),
  base({ id: "f", texte: "Jetée", supprime_le: "2026-10-28T08:00:00Z" }),
];
const F: Filtres = { vue: "actives", projets: [], statut: "tous", q: "", tri: "manuel" };
const nomDe = (id: string | null) => (id === "p1" ? "24-118 · Les Pins" : "Perso");
const ids = (l: Note[]) => l.map((n) => n.id);

describe("filtres", () => {
  it("actives en ordre manuel, sans archivees ni corbeille", () => expect(ids(filtrer(notes, F, moi, nomDe))).toEqual(["b", "a", "c", "d"]));
  it("recherche sans accents, aussi dans le nom du projet", () => {
    expect(ids(filtrer(notes, { ...F, q: "schuco" }, moi, nomDe))).toEqual(["a"]);
    expect(ids(filtrer(notes, { ...F, q: "pins indice" }, moi, nomDe))).toEqual(["b"]);
  });
  it("« Pour moi » : confiees a moi, non reglees", () => expect(ids(filtrer(notes, { ...F, vue: "pour-moi" }, moi, nomDe))).toEqual(["a"]));
  it("filtre Perso et projet", () => {
    expect(ids(filtrer(notes, { ...F, projets: [PERSO] }, moi, nomDe))).toEqual(["c"]);
    expect(ids(filtrer(notes, { ...F, projets: ["p1"], statut: "in_progress" }, moi, nomDe))).toEqual(["b"]);
  });
  it("archivees et corbeille", () => {
    expect(ids(filtrer(notes, { ...F, vue: "archivees" }, moi, nomDe))).toEqual(["e"]);
    expect(ids(filtrer(notes, { ...F, vue: "corbeille" }, moi, nomDe))).toEqual(["f"]);
  });
  it("tri par echeance : datees d'abord", () => expect(ids(filtrer(notes, { ...F, tri: "echeance" }, moi, nomDe))[0]).toBe("a"));
});

describe("outils", () => {
  it("statut suivant en boucle", () => { expect(suivant("todo")).toBe("in_progress"); expect(suivant("done")).toBe("todo"); });
  it("echeances", () => {
    const j = new Date("2026-10-29T10:00:00");
    expect(etatEcheance("2026-10-28", j)).toBe("retard");
    expect(etatEcheance("2026-10-31", j)).toBe("proche");
    expect(etatEcheance("2026-11-10", j)).toBe("ok");
    expect(etatEcheance(null, j)).toBe("aucune");
  });
  it("ordre : en tete et entre deux notes", () => {
    expect(ordreEnTete(notes)).toBe(-1);
    const l = filtrer(notes, F, moi, nomDe); // b(1) a(2) c(3) d(4)
    expect(ordreAvant(l, "c", "d")).toBe(2.5);
    expect(ordreAvant(l, "b", "c")).toBe(0);
  });
  it("nettoyer : reglees depuis plus de 7 jours", () => expect(ids(aNettoyer(notes, Date.parse("2026-10-29T00:00:00Z")))).toEqual(["d"]));
  it("nom de projet", () => {
    expect(nomProjet({ id: "p", nom: "Les Pins", numero: "24-118", cree_par: null, archive: false })).toBe("24-118 · Les Pins");
    expect(nomProjet(null)).toBe("Perso");
  });
});

describe("reprise et sauvegarde", () => {
  const ancien = JSON.stringify([
    { id: "1", text: "Vérifier ancrages", category: "Chantier 1", status: "done", dueDate: "2026-10-27", createdAt: 1761000000000, completedAt: 1761100000000, archived: false, flash: true },
    { id: "2", text: "Garage", category: "Perso", status: "bizarre", dueDate: "demain", createdAt: 1761000000000 },
    { id: "3", text: "   " },
  ]);
  it("lit les notes de l'ancienne version", () => {
    const a = lireAnciennes(ancien);
    expect(a.categories).toEqual(["Chantier 1", "Perso"]);
    expect(a.notes).toHaveLength(2);
    expect(a.notes[0]).toMatchObject({ projet: "Chantier 1", statut: "done", echeance: "2026-10-27", flash: true });
    expect(a.notes[1]).toMatchObject({ statut: "todo", echeance: null });
    expect(lireAnciennes("pas du json").notes).toEqual([]);
  });
  it("« Perso » reste perso, le reste devient projet", () => {
    expect(choixParDefaut(["Chantier 1", "Perso"])).toEqual({ "Chantier 1": { mode: "projet", nom: "Chantier 1" }, Perso: { mode: "perso" } });
  });
  it("import fusionne : rien d'ecrase, pas de doublon", () => {
    const s = JSON.parse(JSON.stringify(exporter([{ id: "p1", nom: "Les Pins", numero: "24-118", cree_par: moi, archive: false }], notes)));
    expect(s.notes.some((n: { texte: string }) => n.texte === "Jetée")).toBe(false);
    expect(planImport(s, notes).notes).toHaveLength(0);
    const p = planImport(s, []);
    expect(p.notes).toHaveLength(5);
    expect(p.projets).toEqual(["Les Pins"]);
    expect(planImport({ notes: JSON.parse(ancien) }, []).notes).toHaveLength(2);
    expect(planImport({ app: "masse" }, []).erreur).toMatch(/pas une sauvegarde Check/);
  });
});
