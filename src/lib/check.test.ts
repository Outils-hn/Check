import { describe, expect, it } from "vitest";
import { groupesAtelier, nbQuestionsAtelier, joursRetard, PERSO, aNettoyer, pourAujourdhui, projetDepuisTexte, type Projet, reponseDe, etatEcheance, filtrer, nomProjet, ordreAvant, ordreEnTete, suivant, type Filtres, type Note } from "./notes";
import { choixParDefaut, exporter, lireAnciennes, planImport } from "./reprise";
import { MAX_INVITE, ajouterInvite, changerStatutInvite, lireInvite, modifierTexteInvite, supprimerInvite } from "./notes-invite";

const moi = "u-moi", autre = "u-marc";
const base = (p: Partial<Note>): Note => ({
  id: "x", projet_id: null, auteur: moi, pour: null, texte: "", statut: "todo", echeance: null, flash: false, archive: false,
  ordre: 0, images: [], reponse: null, regle_le: null, supprime_le: null, created_at: "2026-10-20T08:00:00Z", ...p,
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

  it("reponse : visible seulement si la note est reglee, cherchable, filtre « Avec reponse »", () => {
    const l: Note[] = [
      base({ id: "r1", texte: "Quel joint pour la jonction ?", statut: "done", reponse: "Sikaflex, voir fiche Index", projet_id: "p1" }),
      base({ id: "r2", texte: "Autre question", statut: "done" }),
      base({ id: "r3", texte: "Rouverte", statut: "todo", reponse: "ancienne reponse" }),
    ];
    expect(reponseDe(l[0])).toBe("Sikaflex, voir fiche Index");
    expect(reponseDe(l[2])).toBe("");
    expect(ids(filtrer(l, { ...F, q: "sikaflex" }, moi, nomDe))).toEqual(["r1"]);
    expect(ids(filtrer(l, { ...F, q: "ancienne" }, moi, nomDe))).toEqual([]);
    expect(ids(filtrer(l, { ...F, avecReponse: true }, moi, nomDe))).toEqual(["r1"]);
  });
});

describe("carnet d'essai sans compte", () => {
  it("garde 5 notes au plus et ignore les textes vides", () => {
    let l = lireInvite(null);
    for (let i = 0; i < 8; i++) l = ajouterInvite(l, `note ${i}`, 1000 + i);
    expect(l).toHaveLength(MAX_INVITE);
    expect(ajouterInvite(l, "de trop")).toHaveLength(MAX_INVITE);
    expect(ajouterInvite([], "   ")).toHaveLength(0);
  });
  it("change le statut, modifie, supprime", () => {
    const l = ajouterInvite([], "à faire", 5000);
    const r = changerStatutInvite(l, l[0].id, "done", 9000);
    expect(r[0].status).toBe("done");
    expect(r[0].completedAt).toBe(9000);
    expect(modifierTexteInvite(r, l[0].id, "  nouveau  ")[0].text).toBe("nouveau");
    expect(modifierTexteInvite(r, l[0].id, "  ")[0].text).toBe("à faire");
    expect(supprimerInvite(r, l[0].id)).toHaveLength(0);
  });
  it("est repris tel quel par la fenêtre de reprise (anciennes notes)", () => {
    const l = ajouterInvite([], "Relancer Schüco", 5000);
    const a = lireAnciennes(JSON.stringify(l));
    expect(a.notes).toHaveLength(1);
    expect(a.notes[0]).toMatchObject({ texte: "Relancer Schüco", projet: null, statut: "todo" });
  });
  it("ignore un stockage abîmé", () => {
    expect(lireInvite("pas du json")).toEqual([]);
    expect(lireInvite('{"a":1}')).toEqual([]);
  });
});

describe("Aujourd'hui", () => {
  it("en retard, du jour ou confiee a moi ; jamais reglee", () => {
    expect(pourAujourdhui(base({ echeance: "2026-10-30" }), moi, "2026-11-01")).toBe(true);
    expect(pourAujourdhui(base({ echeance: "2026-11-01" }), moi, "2026-11-01")).toBe(true);
    expect(pourAujourdhui(base({ echeance: "2026-11-02" }), moi, "2026-11-01")).toBe(false);
    expect(pourAujourdhui(base({ pour: moi }), moi, "2026-11-01")).toBe(true);
    expect(pourAujourdhui(base({ pour: autre }), moi, "2026-11-01")).toBe(false);
    expect(pourAujourdhui(base({ pour: moi, statut: "done", echeance: "2026-10-01" }), moi, "2026-11-01")).toBe(false);
  });
});

describe("#projet dans le texte", () => {
  const ps: Projet[] = [
    { id: "p1", nom: "Résidence Les Pins", numero: "24-118", cree_par: null, archive: false },
    { id: "p2", nom: "Gare Cornavin", numero: "", cree_par: null, archive: false },
  ];
  it("par numero, par mot du nom, sans accents ; le tag disparait", () => {
    expect(projetDepuisTexte("Relancer Schüco #24-118", ps)).toEqual({ texte: "Relancer Schüco", projetId: "p1" });
    expect(projetDepuisTexte("#cornavin vérifier cotes", ps)).toEqual({ texte: "vérifier cotes", projetId: "p2" });
    expect(projetDepuisTexte("Appeler #residence", ps).projetId).toBe("p1");
  });
  it("tag inconnu : texte inchange", () => expect(projetDepuisTexte("Faire #truc", ps)).toEqual({ texte: "Faire #truc", projetId: null }));
});

describe("PDF : retards", () => {
  it("compte les jours de retard", () => {
    expect(joursRetard("2026-11-05", "2026-11-10")).toBe(5);
    expect(joursRetard("2026-11-10", "2026-11-10")).toBe(0);
    expect(joursRetard(null, "2026-11-10")).toBe(0);
  });
});

describe("atelier / montage", () => {
  const q = (p: Partial<Note>) => base({ projet_id: "p1", atelier: true, ...p });
  const liste: Note[] = [
    q({ id: "q1", texte: "Quel jeu sous la lisse ?", tache: "1234", created_at: "2026-11-02T08:00:00Z" }),
    q({ id: "q2", texte: "Cale de 3 ou de 5 ?", tache: "1234", created_at: "2026-11-01T08:00:00Z" }),
    q({ id: "q3", texte: "Fixation arrière", tache: "1234", statut: "done", reponse: "M8" }),
    q({ id: "q4", texte: "Tâche réglée", tache: "99", statut: "done" }),
    q({ id: "q5", texte: "Autre tâche", tache: "200" }),
    q({ id: "q6", texte: "Jetée", tache: "1234", supprime_le: "2026-11-05T08:00:00Z" }),
    q({ id: "q7", texte: "Archivée", tache: "1234", archive: true }),
    base({ id: "q8", texte: "Note normale", projet_id: "p1" }),
    base({ id: "q9", texte: "Perso", atelier: true, tache: "1" }),
  ];
  it("regroupe par tache, questions les plus anciennes d'abord, taches a traiter en premier", () => {
    const g = groupesAtelier(liste, nomDe);
    expect(g.map((x) => x.tache)).toEqual(["200", "1234", "99"]);
    expect(ids(g[1].enAttente)).toEqual(["q2", "q1"]);
    expect(ids(g[1].reglees)).toEqual(["q3"]);
  });
  it("ignore corbeille, archives, notes normales et perso", () => expect(groupesAtelier(liste, nomDe).flatMap((x) => [...x.enAttente, ...x.reglees]).length).toBe(5));
  it("tache en minuscules et sans accents = meme tache", () => {
    const g = groupesAtelier([q({ id: "a", tache: "Façade A" }), q({ id: "b", tache: "facade a" })], nomDe);
    expect(g.length).toBe(1);
  });
  it("compte les questions sans reponse", () => expect(nbQuestionsAtelier(liste)).toBe(3));
});
