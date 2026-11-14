// Check-up Check dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// La simulation reproduit les regles de la base : notes perso pour leur auteur, notes de projet pour l'equipe.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const out = process.argv[2] || "out";
const URL0 = "http://127.0.0.1:8080";
const SB = "https://dtxgvwaqjmmffiiohika.supabase.co";
const lignes = [];
let etape = "debut";
const ok = (cond, msg) => { lignes.push(`${cond ? "OK" : "ECHEC"} ${msg}`); console.log(`${cond ? "OK" : "ECHEC"} ${msg}`); fs.writeFileSync(`${out}/checkup.txt`, lignes.join("\n") + "\n"); };

const COMPTES = {
  "alice@exemple.ch": { id: "11111111-1111-4111-8111-111111111111", nom: "Alice Martin", valide: true },
  "bob@exemple.ch": { id: "22222222-2222-4222-8222-222222222222", nom: "Bob Keller", valide: true },
  "carl@exemple.ch": { id: "33333333-3333-4333-8333-333333333333", nom: "Carl Roth", valide: false },
};
const MDP = "Motdepasse-compte";
const ALICE = COMPTES["alice@exemple.ch"].id, BOB = COMPTES["bob@exemple.ch"].id;
const parId = (id) => Object.entries(COMPTES).find(([, c]) => c.id === id);

// ---- Base simulee ----
const etat = { check_projets: [], check_membres: [], check_notes: [], check_retenir: [], check_notes_histo: [] };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC", "base64");
const fichiers = [];
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const valide = (u) => !!u && !!parId(u)?.[1].valide;
const membre = (u, p) => etat.check_membres.some((m) => m.projet_id === p && m.user_id === u);
const voit = (t, u, r) => valide(u) && (
  t === "check_projets" ? membre(u, r.id) || r.cree_par === u
  : t === "check_membres" ? membre(u, r.projet_id)
  : t === "check_retenir" ? true
  : t === "check_notes_histo" ? voit("check_notes", u, etat.check_notes.find((n) => n.id === r.note_id) || { projet_id: null, auteur: null })
  : r.projet_id === null ? r.auteur === u : membre(u, r.projet_id));
const filtres = (url) => [...url.searchParams.entries()].filter(([k, v]) => !["select", "order", "limit"].includes(k) && (v.startsWith("eq.") || v.startsWith("in."))).map(([k, v]) => [k, v.startsWith("in.") ? v.slice(4, -1).split(",").map((x) => x.replace(/^"|"$/g, "")) : v.slice(3)]);
const correspond = (r, f) => f.every(([k, v]) => (Array.isArray(v) ? v.includes(String(r[k])) : String(r[k]) === v));
function controleNote(note, avant) {
  if (note.pour && note.projet_id && !membre(note.pour, note.projet_id)) return "La personne choisie ne fait pas partie de l'équipe du projet";
  if (note.statut === "done" && (!avant || avant.statut !== "done")) note.regle_le = new Date().toISOString();
  if (note.statut !== "done") note.regle_le = null;
  if (avant) note.auteur = avant.auteur;
  return null;
}

async function brancher(ctx) {
  await ctx.routeWebSocket(/realtime/, () => { /* direct : sans objet dans la simulation */ });
  await ctx.route(`${SB}/**`, async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const tok = (req.headers()["authorization"] || "").replace("Bearer ", "");
    const moi = tok.startsWith("tok-") ? tok.slice(4) : null;
    const json = (b, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });
    const refus = () => json({ code: "42501", message: "new row violates row-level security policy" }, 403);
    if (u.pathname === "/auth/v1/token") {
      const { email, password } = JSON.parse(req.postData() || "{}");
      const c = COMPTES[email];
      if (!c || password !== MDP) return json({ error: "invalid_grant", msg: "Invalid login credentials", code: "invalid_credentials" }, 400);
      return json({ access_token: `tok-${c.id}`, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r",
        user: { id: c.id, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } });
    }
    if (u.pathname === "/auth/v1/logout") return r.fulfill({ status: 204, body: "" });
    if (u.pathname.startsWith("/auth/v1/user")) { const e = parId(moi); return e ? json({ id: moi, email: e[0], aud: "authenticated", role: "authenticated" }) : json({ msg: "no" }, 401); }
    if (u.pathname === "/rest/v1/rpc/is_approved") return json(valide(moi));
    if (u.pathname === "/rest/v1/rpc/check_comptes") return json(valide(moi) ? Object.entries(COMPTES).filter(([, c]) => c.valide).map(([email, c]) => ({ id: c.id, nom: c.nom, email })) : []);
    if (u.pathname === "/rest/v1/rpc/check_vider_corbeille") return r.fulfill({ status: 204, body: "" });
    if (u.pathname.startsWith("/storage/v1/")) { // stockage des images : simule
      if (req.method() === "POST" && u.pathname.startsWith("/storage/v1/object/sign/")) { const { paths } = JSON.parse(req.postData() || "{}"); return json(paths.map((p) => ({ path: p, signedURL: `/object/sign/check-images/${p}?token=x`, error: null }))); }
      if (req.method() === "GET") return r.fulfill({ status: 200, contentType: "image/png", body: PNG });
      if (req.method() === "POST") { fichiers.push(decodeURIComponent(u.pathname.replace("/storage/v1/object/check-images/", ""))); return json({ Key: "check-images/x", Id: "x" }); }
      if (req.method() === "DELETE") { const { prefixes } = JSON.parse(req.postData() || "{}"); for (const x of prefixes || []) { const i = fichiers.indexOf(x); if (i >= 0) fichiers.splice(i, 1); } return json([]); }
      return json([]);
    }
    const t = u.pathname.replace("/rest/v1/", "");
    if (!(t in etat)) return json([]);
    const m = req.method();
    const f = filtres(u);
    if (m === "GET") return json(etat[t].filter((x) => voit(t, moi, x) && correspond(x, f)));
    if (!valide(moi)) return refus();
    const corps = req.postData() ? JSON.parse(req.postData()) : null;
    const unique = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    if (m === "POST") {
      const rows = (Array.isArray(corps) ? corps : [corps]).map((x) => (t === "check_membres" ? { ...x } : { id: uid(), created_at: new Date().toISOString(), ...x }));
      for (const x of rows) {
        if (t === "check_projets" && x.cree_par !== moi) return refus();
        if (t === "check_membres" && (!membre(moi, x.projet_id) || !valide(x.user_id))) return refus();
        if (t === "check_notes") {
          if (x.auteur !== moi || (x.projet_id && !membre(moi, x.projet_id))) return refus();
          Object.assign(x, { images: [], statut: "todo", flash: false, archive: false, ordre: 0, pour: null, echeance: null, supprime_le: null, regle_le: null, ...x });
          const e = controleNote(x, null); if (e) return json({ code: "P0001", message: e }, 400);
        }
      }
      etat[t].push(...rows);
      if (t === "check_projets") rows.forEach((p) => { etat.check_membres.push({ projet_id: p.id, user_id: moi }); lignes.push(`NOTE projet cree « ${p.nom} » a l'etape ${etape}`); });
      return json(unique ? rows[0] : rows, 201);
    }
    const cibles = etat[t].filter((x) => voit(t, moi, x) && correspond(x, f));
    if (m === "PATCH") {
      for (const x of cibles) { const avant = { ...x }; if (t === "check_notes" && corps && "statut" in corps && corps.statut !== x.statut) etat.check_notes_histo.push({ id: etat.check_notes_histo.length + 1, note_id: x.id, user_id: moi, le: new Date().toISOString(), champ: "statut", avant: x.statut, apres: corps.statut }); Object.assign(x, corps); if (t === "check_notes") { const e = controleNote(x, avant); if (e) { Object.assign(x, avant); return json({ code: "P0001", message: e }, 400); } } }
      return json([], 200);
    }
    if (m === "DELETE") { etat[t] = etat[t].filter((x) => !cibles.includes(x)); return r.fulfill({ status: 204, body: "" }); }
    return json([]);
  });
}

const b = await chromium.launch();
const pages = [];
async function page({ dark = false, anciennes = null, largeur = 1440 } = {}) {
  const ctx = await b.newContext({ viewport: { width: largeur, height: largeur < 600 ? 800 : 900 }, acceptDownloads: true, serviceWorkers: "block" });
  await ctx.addInitScript(([d, a]) => { if (d) localStorage.setItem("check-theme", "dark"); if (a && !localStorage.getItem("check-reprise-faite")) localStorage.setItem("dp-notes-v1", a); }, [dark, anciennes]);
  await brancher(ctx);
  const p = await ctx.newPage();
  pages.push(p);
  p.on("console", (m) => m.type() === "error" && lignes.push(`NOTE console : ${m.text().slice(0, 200)}`));
  p.on("pageerror", (e) => ok(false, `erreur JS : ${e.message}`));
  return p;
}
const shot = async (p, nom) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nom}.png`, fullPage: true }); };
async function seConnecter(p, email) {
  await p.getByRole("button", { name: "Se connecter" }).first().click();
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Mot de passe", { exact: true }).fill(MDP);
  await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click();
  await p.waitForTimeout(1500);
}
const lignesNotes = (p) => p.locator("[data-note]");
const J = 86400000;
const anciennes = JSON.stringify([
  { id: "a1", text: "Vérifier les ancrages HFT niveau 3", category: "Chantier 1", status: "todo", dueDate: new Date(Date.now() - 2 * J).toISOString().slice(0, 10), createdAt: Date.now() - 5 * J, archived: false, flash: true },
  { id: "a2", text: "Relancer Schüco pour l'imposte", category: "Chantier 1", status: "waiting", dueDate: null, createdAt: Date.now() - 3 * J, archived: false },
  { id: "a3", text: "Rendez-vous garage", category: "Perso", status: "todo", dueDate: null, createdAt: Date.now() - J, archived: false },
]);

try {
  // 1. Sans compte
  const p = await page({ anciennes });
  await p.goto(URL0); await p.waitForLoadState("networkidle");
  { const man = await p.locator('link[rel="manifest"]').getAttribute("href");
    const rep = man ? await p.request.get(new URL(man, p.url()).href) : null;
    const j = rep && rep.ok() ? await rep.json().catch(() => null) : null;
    ok(!!j && j.display === "standalone" && j.icons?.length >= 2, "Installation : manifeste présent (icônes, mode application)");
    const sw = await p.request.get(new URL("sw.js", p.url()).href);
    ok(sw.ok() && (await sw.text()).includes("check-"), "Hors ligne : service worker servi"); }
  ok(await p.getByText("Connectez-vous pour utiliser Check").isVisible(), "sans compte : invitation à se connecter");
  ok((await p.getAttribute("html", "lang")) === "fr", "langue de la page = fr");
  await shot(p, "01-accueil");

  // 2. Compte non valide
  const pc = await page();
  await pc.goto(URL0); await pc.waitForLoadState("networkidle");
  await seConnecter(pc, "carl@exemple.ch");
  ok(await pc.getByText("Compte en attente de validation").first().isVisible(), "compte non validé : en attente, aucune note");

  // 3. Alice : reprise des notes de son navigateur
  await seConnecter(p, "alice@exemple.ch");
  etape = "reprise";
  ok(await p.getByRole("heading", { name: "Reprendre les notes de ce navigateur" }).isVisible(), "première connexion : reprise des anciennes notes proposée");
  await shot(p, "02-reprise");
  await p.getByRole("button", { name: "Importer", exact: true }).click();
  await p.waitForTimeout(1500);
  const projet = etat.check_projets.find((x) => x.nom === "Chantier 1");
  ok(!!projet && etat.check_notes.filter((x) => x.projet_id === projet.id).length === 2, "« Chantier 1 » devenu un projet avec ses 2 notes");
  ok(etat.check_notes.some((x) => x.projet_id === null && x.texte === "Rendez-vous garage" && x.auteur === ALICE), "« Perso » resté en notes perso");
  ok((await lignesNotes(p).count()) === 3, "3 notes affichées après reprise");

  // 4. Equipe : Alice invite Bob
  etape = "equipe";
  await p.getByRole("button", { name: "Projet et équipe : Chantier 1" }).click();
  await p.getByLabel("Collègue à inviter").selectOption({ label: "Bob Keller" });
  await p.getByRole("button", { name: "Inviter" }).click();
  await p.waitForTimeout(800);
  ok(membre(BOB, projet.id), "Bob invité dans l'équipe du projet");
  const debordeDialogue = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); const R = d.getBoundingClientRect(); return [...d.querySelectorAll("input, select, button, li")].filter((e) => e.getBoundingClientRect().right > R.right + 1).map((e) => e.getAttribute("aria-label") || e.id || e.textContent.trim().slice(0, 20)); });
  ok(debordeDialogue.length === 0, "fenetre Projet et equipe : rien ne depasse " + debordeDialogue.join(", "));
  await shot(p, "03-equipe");
  await p.getByRole("button", { name: "Fermer" }).click();

  // 4b. Note vide : un message, pas de silence
  etape = "vide";
  await p.getByLabel("Texte de la note").press("Enter");
  ok(await p.getByText("Écrivez d'abord quelque chose à ajouter.").isVisible(), "note vide : message affiché");

  // 5. Note confiee a Bob
  etape = "note";
  await p.getByLabel("Projet de la note").selectOption({ label: "Chantier 1" });
  await p.getByLabel("Texte de la note").fill("Contrôler la liste de fabrication indice B");
  await p.waitForTimeout(300);
  await p.getByLabel("Pour qui").selectOption({ label: "Pour : Bob Keller" });
  await p.getByLabel("Texte de la note").press("Enter");
  await p.waitForTimeout(1200);
  const confiee = etat.check_notes.find((x) => x.texte.startsWith("Contrôler"));
  ok(confiee?.pour === BOB && confiee?.projet_id === projet.id, "note ajoutée avec Entrée, confiée à Bob");
  ok(await p.getByText("Pour Bob Keller").isVisible(), "« Pour Bob Keller » affiché sous la note");
  await p.getByLabel("Rechercher une note").fill("schuco");
  ok((await lignesNotes(p).count()) === 1, "recherche « schuco » trouve Schüco (sans tréma)");
  await p.getByLabel("Rechercher une note").press("Escape");
  await shot(p, "04-alice");

  // 6. Bob : voit le projet, pas les notes perso d'Alice
  const p2 = await page();
  await p2.goto(URL0); await p2.waitForLoadState("networkidle");
  await seConnecter(p2, "bob@exemple.ch");
  ok((await lignesNotes(p2).count()) === 3, "Bob voit les 3 notes du projet");
  ok(!(await p2.getByText("Rendez-vous garage").count()), "Bob ne voit PAS les notes perso d'Alice");
  ok(await p2.getByRole("tab", { name: /Pour moi · 1/ }).isVisible(), "onglet « Pour moi · 1 » chez Bob");
  ok(await p2.getByRole("tab", { name: /Aujourd'hui · \d/ }).isVisible(), "onglet « Aujourd'hui » avec son compteur chez Bob");
  ok(/^\(\d+\) Check/.test(await p2.title()), `titre de l'onglet avec le nombre à traiter (${await p2.title()})`);
  await p2.getByRole("tab", { name: /Pour moi/ }).click();
  ok((await lignesNotes(p2).count()) === 1, "« Pour moi » : la note confiée");
  ok(await p2.getByText("par Alice Martin").isVisible(), "auteur affiché (« par Alice Martin »)");
  await p2.getByRole("button", { name: /Statut : À faire/ }).click(); await p2.waitForTimeout(400);
  await p2.getByRole("button", { name: /Statut : En cours/ }).click(); await p2.waitForTimeout(400);
  await p2.getByRole("button", { name: /Statut : En attente/ }).click(); await p2.waitForTimeout(800);
  ok(confiee.statut === "done" && !!confiee.regle_le, "Bob règle la note (statut en un clic)");
  // 6b. Reponse (3.0) : notification apres « Reglé », champ facultatif, affichage, filtre, recherche
  await p2.getByRole("button", { name: "Ajouter une réponse" }).click(); await p2.waitForTimeout(600);
  ok(await p2.locator("#e-reponse").isVisible(), "« Ajouter une réponse » ouvre la note avec le champ Réponse");
  ok(await p2.locator("#e-reponse").evaluate((e) => e === document.activeElement), "le curseur est dans le champ Réponse");
  await p2.locator("#e-reponse").fill("Indice B validé avec Marc : joint Sikaflex");
  await p2.getByRole("button", { name: "Enregistrer" }).click(); await p2.waitForTimeout(900);
  ok(confiee.reponse === "Indice B validé avec Marc : joint Sikaflex", "réponse enregistrée dans la base");
  // Historique : Alice voit que Bob a réglé la note
  await p.locator("[data-note]", { hasText: "Contrôler" }).getByRole("button", { name: "Modifier la note" }).click(); await p.waitForTimeout(400);
  await p.getByRole("button", { name: "Voir l'historique des changements" }).click(); await p.waitForTimeout(700);
  ok(/Bob/.test(await p.locator("[data-histo]").innerText()) || (await p.locator("[data-histo]").innerText()).includes("Statut"), "Historique : la liste des changements s'affiche");
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p2.getByRole("tab", { name: "Actives" }).click(); await p2.waitForTimeout(500);
  ok(await p2.locator("[data-reponse]", { hasText: "Sikaflex" }).first().isVisible(), "la réponse s'affiche sous la note réglée");
  await shot(p2, "05b-reponse");
  await p2.getByRole("button", { name: "Avec réponse" }).click(); await p2.waitForTimeout(400);
  ok((await lignesNotes(p2).count()) === 1, "filtre « Avec réponse » : 1 note");
  await p2.getByRole("button", { name: "Avec réponse" }).click(); await p2.waitForTimeout(300);
  await p2.getByLabel("Rechercher une note").fill("sikaflex"); await p2.waitForTimeout(400);
  ok((await lignesNotes(p2).count()) === 1, "la recherche trouve aussi le texte de la réponse");
  await p2.getByLabel("Rechercher une note").press("Escape");
  await shot(p2, "05-bob");
  await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);
  // Lien « Noter dans Check » depuis une autre appli : le texte arrive prêt à valider, l'adresse est nettoyée
  { const pn = await p.context().newPage(); await pn.goto(URL0 + "?noter=" + encodeURIComponent("Fiche Sika : à vérifier")); await pn.waitForLoadState("networkidle");
    ok((await pn.locator("textarea").first().inputValue()) === "Fiche Sika : à vérifier", "« Noter dans Check » : texte repris dans la saisie");
    ok(!pn.url().includes("noter="), "« Noter dans Check » : adresse nettoyée"); await pn.close(); }
  // Lien direct vers une note (recherche Ctrl+K de l'Accueil) : sa fenêtre de modification s'ouvre
  { const idNote = etat.check_notes.find((n) => !n.supprime_le && n.texte)?.id;
    const pn = await p.context().newPage(); await pn.goto(URL0 + "?note=" + idNote); await pn.waitForLoadState("networkidle"); await pn.waitForTimeout(1500);
    ok(await pn.getByRole("dialog").isVisible(), `Lien ?note= : la fenêtre de la note s'ouvre (id ${idNote}) ${(await pn.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
    ok(!pn.url().includes("note="), "Lien ?note= : adresse nettoyée"); await pn.close(); }
  // « À retenir » : visible par tout le bureau ; seul l'auteur supprime
  await p.getByRole("button", { name: /^À retenir/ }).click();
  const zr = p.locator('section[aria-label="À retenir"]');
  await zr.getByLabel("L'essentiel en une phrase").fill("Coller le joint avant la pose du capot");
  await zr.getByLabel("Détail").fill("Retour de l'atelier : sinon le capot ne ferme plus.");
  await zr.getByLabel("Sujet").fill("Atelier");
  await zr.getByRole("button", { name: "Ajouter", exact: true }).click(); await p.waitForTimeout(400);
  ok(await p.locator("[data-retenir]", { hasText: "Coller le joint" }).isVisible(), "« À retenir » : la fiche d'Alice apparaît");
  await shot(p, "08-a-retenir");
  await p2.getByRole("button", { name: /^À retenir/ }).click();
  await p2.locator("[data-retenir]", { hasText: "Coller le joint" }).waitFor({ timeout: 4000 }).catch(() => {});
  ok(await p2.locator("[data-retenir]", { hasText: "Coller le joint" }).isVisible(), "« À retenir » : Bob voit la fiche d'Alice");
  ok((await p2.getByRole("button", { name: /Supprimer « Coller/ }).count()) === 0, "« À retenir » : Bob ne peut pas supprimer la fiche d'Alice");
  await p2.getByLabel("Rechercher dans À retenir").fill("capot"); ok((await p2.locator("[data-retenir]").count()) === 1, "« À retenir » : recherche");
  await p2.getByRole("button", { name: "Retour à mes notes" }).click();
  await p.getByRole("button", { name: "Retour à mes notes" }).click();
  // « Questions Tâches » : questions par tache, PDF a emporter, reponse saisie, repli, suppression de la tache
  etape = "questions taches";
  await p.getByRole("button", { name: /^Questions Tâches/ }).click();
  const za = p.locator('section[aria-label="Questions Tâches"]');
  await za.getByLabel("Projet", { exact: true }).selectOption({ label: "Chantier 1" });
  await za.getByLabel("Numéro de tâche").fill("1234");
  await za.getByLabel("Votre question").fill("Quel jeu sous la lisse ?"); await za.getByLabel("Votre question").press("Enter"); await p.waitForTimeout(500);
  await za.getByLabel("Votre question").fill("Cale de 3 ou de 5 ?"); await za.getByLabel("Votre question").press("Enter"); await p.waitForTimeout(500);
  await za.getByLabel("Numéro de tâche").fill("200");
  await za.getByLabel("Votre question").fill("Autre tâche : longueur du fer plat ?"); await za.getByLabel("Votre question").press("Enter"); await p.waitForTimeout(500);
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 2 && (await p.locator('[data-tache="200"] [data-question]').count()) === 1, "questions rangées sous leur tâche (1234 : 2, 200 : 1)");
  ok(etat.check_notes.filter((x) => x.atelier && x.projet_id === projet.id).length === 3, "questions enregistrées comme notes de projet");
  // Réordonner les questions d'une tâche (flèches) : la nouvelle question arrive en fin de liste
  const ordreQ = () => p.locator('[data-tache="1234"] [data-question]').allInnerTexts().then((l) => l.map((t) => (t.includes("Quel jeu") ? "jeu" : "cale")).join(","));
  ok((await ordreQ()) === "jeu,cale", "questions : les nouvelles arrivent en fin de liste");
  await p.locator("[data-question]", { hasText: "Quel jeu" }).getByRole("button", { name: "Descendre la question" }).click(); await p.waitForTimeout(600);
  ok((await ordreQ()) === "cale,jeu", "questions : « Descendre » change l'ordre");
  await p.reload({ waitUntil: "networkidle" }); await p.getByRole("button", { name: /^Questions Tâches/ }).click();
  ok((await ordreQ()) === "cale,jeu", "questions : l'ordre choisi est gardé après rechargement");
  await p.locator("[data-question]", { hasText: "Quel jeu" }).getByRole("button", { name: "Monter la question" }).click(); await p.waitForTimeout(600);
  ok((await ordreQ()) === "jeu,cale", "questions : « Monter » remet l'ordre");
  await shot(p, "08b-questions-taches");
  const dlq = p.waitForEvent("download");
  await p.locator('[data-tache="1234"]').getByRole("button", { name: /^PDF de/ }).click();
  const pdfq = await dlq;
  await pdfq.saveAs(`${out}/questions-tache.pdf`);
  ok(/^check-questions-taches-\d{4}-\d{2}-\d{2}\.pdf$/.test(pdfq.suggestedFilename()) && fs.statSync(await pdfq.path()).size > 1500, `export PDF des questions (${pdfq.suggestedFilename()})`);
  await p2.reload({ waitUntil: "networkidle" }); // le direct est simule : on recharge pour voir ce qu'Alice vient d'ajouter
  ok(!(await p2.getByText("Quel jeu sous la lisse").count()) && !(await p2.getByText("Cale de 3 ou de 5").count()), "les questions n'apparaissent pas dans la liste des notes");
  await p2.getByRole("button", { name: /^Questions Tâches/ }).click();
  await p2.locator("[data-question]").first().waitFor({ timeout: 4000 }).catch(() => {});
  ok((await p2.locator("[data-question]").count()) === 3, "Bob voit les questions de l'équipe");
  await p2.getByRole("button", { name: "Retour à mes notes" }).click();
  await p.locator("[data-question]", { hasText: "Quel jeu" }).getByRole("button", { name: "Répondre" }).click();
  await p.getByLabel(/^Réponse/).fill("5 mm, cale en nylon");
  await p.getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(800);
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 1 && await p.locator("[data-reglee]", { hasText: "Quel jeu" }).locator("[data-reponse]", { hasText: "5 mm" }).isVisible(), "réponse saisie, la question passe en réglée");
  // Modifier une question (texte et destinataire)
  await p.locator("[data-question]", { hasText: "Cale de 3" }).getByRole("button", { name: "Modifier la question" }).click();
  await p.getByLabel("Question", { exact: true }).fill("Cale de 3 ou de 4 ?");
  await p.getByLabel("Destinataire de la question").selectOption("montage");
  await p.getByRole("button", { name: "Enregistrer", exact: true }).click(); await p.waitForTimeout(600);
  ok(await p.locator("[data-question]", { hasText: "Cale de 3 ou de 4" }).locator('[data-dest="montage"]').isVisible() && etat.check_notes.some((x) => x.texte === "Cale de 3 ou de 4 ?" && x.destinataire === "montage"), "question modifiée : texte et destinataire");
  await p.locator("[data-question]", { hasText: "Cale de 3 ou de 4" }).getByRole("button", { name: "Modifier la question" }).click();
  await p.getByLabel("Question", { exact: true }).fill("Cale de 3 ou de 5 ?");
  await p.getByLabel("Destinataire de la question").selectOption("atelier");
  await p.getByRole("button", { name: "Enregistrer", exact: true }).click(); await p.waitForTimeout(600);
  // Case « posée » : j'attends la réponse (reste en attente), puis on annule
  const qc = p.locator("[data-question]", { hasText: "Cale de 3" });
  await qc.getByRole("button", { name: "Marquer la question comme posée" }).click(); await p.waitForTimeout(600);
  ok(etat.check_notes.find((x) => x.texte.includes("Cale de 3"))?.statut === "in_progress" && await qc.getByText("j'attends la réponse").isVisible(), "case « posée » : la question passe en « j'attends la réponse »");
  await qc.getByRole("button", { name: /Question posée/ }).click(); await p.waitForTimeout(600);
  ok(etat.check_notes.find((x) => x.texte.includes("Cale de 3"))?.statut === "todo", "case « posée » : annulation");
  // Recherche de tache et choix d'une tache existante en un clic
  await za.getByLabel("Numéro de tâche").fill("");
  ok(await za.getByRole("button", { name: "1234", exact: true }).isVisible() && await za.getByRole("button", { name: "200", exact: true }).isVisible(), "tâches du projet proposées en un clic");
  await za.getByRole("button", { name: "200", exact: true }).click();
  ok((await za.getByLabel("Numéro de tâche").inputValue()) === "200", "un clic sur une tâche remplit le numéro");
  await za.getByLabel("Rechercher une tâche").fill("lisse");
  ok((await p.locator("[data-tache]").count()) === 1 && await p.locator('[data-tache="1234"]').isVisible(), "recherche « lisse » : seule la tâche 1234");
  await za.getByLabel("Rechercher une tâche").fill("fer plat");
  ok((await p.locator("[data-tache]").count()) === 1 && await p.locator('[data-tache="200"]').isVisible(), "recherche « fer plat » : seule la tâche 200");
  await za.getByLabel("Rechercher une tâche").fill("zzz");
  ok(await p.getByText(/Aucune tâche ne correspond/).isVisible(), "recherche sans résultat : message");
  await za.getByLabel("Rechercher une tâche").press("Escape");
  ok((await p.locator("[data-tache]").count()) === 2, "Échap vide la recherche");
  // Nom d'une tache : a la creation d'une nouvelle tache, puis renommer avec le crayon
  await za.getByLabel("Numéro de tâche").fill("300");
  await za.getByLabel("Nom de la tâche").fill("Façade nord");
  await za.getByLabel("Votre question").fill("Peinture RAL 7016 ?"); await za.getByLabel("Votre question").press("Enter"); await p.waitForTimeout(500);
  ok(await p.locator('[data-tache="300"]').getByText(/Tâche 300 · Façade nord/).isVisible(), "tâche créée avec son nom");
  await za.getByLabel("Numéro de tâche").fill("300");
  ok(!(await za.getByLabel("Nom de la tâche").count()) && await za.getByText(/Tâche existante/).isVisible(), "tâche existante : le nom n'est pas redemandé");
  // Question pour un fournisseur : repere, filtre par destinataire
  await za.getByLabel("Destinataire", { exact: true }).selectOption("fournisseur");
  await za.getByLabel("Nom du fournisseur").fill("Schüco");
  await za.getByLabel("Votre question").fill("Existe-t-il en 3 m ?"); await za.getByLabel("Votre question").press("Enter"); await p.waitForTimeout(500);
  ok(await p.locator('[data-tache="300"] [data-dest="fournisseur"]', { hasText: "Fournisseur · Schüco" }).isVisible(), "question fournisseur : repère « Fournisseur · Schüco »");
  ok(etat.check_notes.some((x) => x.atelier && x.destinataire === "fournisseur" && x.fournisseur === "Schüco"), "destinataire et fournisseur enregistrés");
  await za.getByLabel("Destinataire", { exact: true }).selectOption("atelier");
  await za.getByRole("button", { name: "Fournisseur", exact: true }).click();
  ok((await p.locator("[data-tache]").count()) === 1 && await p.locator('[data-tache="300"]').isVisible(), "filtre « Fournisseur » : seule la tâche 300");
  await za.getByRole("button", { name: "Atelier", exact: true }).click({ modifiers: ["Control"] });
  ok((await p.locator("[data-tache]").count()) === 3 && await za.getByRole("button", { name: "Fournisseur", exact: true }).getAttribute("aria-pressed") === "true", "filtre : Ctrl + clic ajoute « Atelier » à « Fournisseur »");
  await za.getByRole("button", { name: "Tous", exact: true }).click();
  ok((await p.locator("[data-tache]").count()) === 3, "filtre « Tous » : les 3 tâches");
  await p.getByRole("button", { name: "Modifier Tâche 200" }).click();
  await p.getByRole("dialog").getByLabel(/^Nom de la tâche/).fill("Fers plats");
  await p.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(800);
  ok(await p.locator('[data-tache="200"]').getByText(/Tâche 200 · Fers plats/).isVisible(), "tâche 200 renommée avec le crayon");
  // Changer le numero d'une tache : toutes ses questions suivent
  await p.getByRole("button", { name: "Modifier Tâche 300" }).click();
  await p.getByRole("dialog").getByLabel("Numéro de tâche").fill("350");
  await p.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(1000);
  ok(await p.locator('[data-tache="350"]').getByText(/Tâche 350 · Façade nord/).isVisible() && !(await p.locator('[data-tache="300"]').count()), "numéro de tâche modifié (300 → 350), le nom reste");
  ok(etat.check_notes.filter((x) => x.atelier && x.tache === "350").length === 2 && !etat.check_notes.some((x) => x.tache === "300"), "toutes les questions de la tâche suivent le nouveau numéro");
  await za.getByLabel("Rechercher une tâche").fill("façade nord");
  ok((await p.locator("[data-tache]").count()) === 1 && await p.locator('[data-tache="350"]').isVisible(), "la recherche trouve une tâche par son nom");
  await za.getByLabel("Rechercher une tâche").press("Escape");
  await p.getByRole("button", { name: /^Supprimer Tâche 350/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Supprimer la tâche" }).click(); await p.waitForTimeout(800);
  // Rouvrir une question reglee, la reregler ; le PDF d'une tache reprend aussi les questions reglees
  await p.locator("[data-reglee]", { hasText: "Quel jeu" }).getByRole("button", { name: "Rouvrir la question" }).click(); await p.waitForTimeout(800);
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 2 && !(await p.locator("[data-reglee]").count()), "question rouverte : elle repasse en attente");
  await p.locator("[data-question]", { hasText: "Quel jeu" }).getByRole("button", { name: "Répondre" }).click();
  ok((await p.getByLabel(/^Réponse/).inputValue()) === "5 mm, cale en nylon", "la réponse précédente est gardée à la réouverture");
  await p.getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(800);
  await p.locator("[data-reglee]", { hasText: "Quel jeu" }).getByRole("button", { name: "Modifier la réponse" }).click();
  await p.getByLabel(/^Réponse/).fill("6 mm, cale en nylon");
  await p.getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(800);
  ok(await p.locator("[data-reglee]", { hasText: "Quel jeu" }).locator("[data-reponse]", { hasText: "6 mm" }).isVisible(), "réponse corrigée après coup");
  const dlr = p.waitForEvent("download");
  await p.locator('[data-tache="1234"]').getByRole("button", { name: /^PDF de/ }).click();
  const pdfr = await dlr;
  ok(fs.statSync(await pdfr.path()).size > 1500, "PDF d'une tâche avec une question réglée");
  await pdfr.saveAs(`${out}/questions-tache-reglee.pdf`);
  { const dlg = p.waitForEvent("download");
    await za.getByRole("button", { name: "PDF", exact: true }).click();
    await (await dlg).saveAs(`${out}/questions-global.pdf`); }
  // Replier / deplier une tache
  const entete = p.locator('[data-tache="1234"]').getByRole("button", { expanded: true }).first();
  await entete.click();
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 0 && await p.locator('[data-tache="1234"]').getByRole("button", { expanded: false }).isVisible(), "tâche repliée : questions masquées");
  ok((await p.locator('[data-tache="200"] [data-question]').count()) === 1, "l'autre tâche reste dépliée");
  await p.reload({ waitUntil: "networkidle" });
  await p.getByRole("button", { name: /^Questions Tâches/ }).click();
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 0, "le repli est retenu après rechargement");
  await p.locator('[data-tache="1234"]').getByRole("button", { expanded: false }).click();
  ok((await p.locator('[data-tache="1234"] [data-question]').count()) === 1, "tâche dépliée à nouveau");
  // Suppression d'une tache et de ses questions (avec confirmation)
  await p.getByRole("button", { name: /^Supprimer Tâche 1234/ }).click();
  ok(await p.getByRole("dialog").getByText(/n'a pas encore de réponse/).isVisible(), "confirmation : prévient qu'une question n'a pas de réponse");
  await p.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();
  ok(etat.check_notes.filter((x) => x.atelier && x.tache === "1234").length === 2, "annuler ne supprime rien");
  await p.getByRole("button", { name: /^Supprimer Tâche 1234/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Supprimer la tâche" }).click(); await p.waitForTimeout(1200);
  ok(!(await p.locator('[data-tache="1234"]').count()) && etat.check_notes.filter((x) => x.atelier && x.tache === "1234").length === 0, "tâche 1234 et ses questions supprimées");
  ok(etat.check_notes.filter((x) => x.atelier && x.tache === "200").length === 1, "l'autre tâche est intacte");
  await p.getByRole("button", { name: "Retour à mes notes" }).click();
  // Nettoyage : la derniere tache disparait aussi, la suite du check-up retrouve ses 4 notes
  await p.getByRole("button", { name: /^Questions Tâches/ }).click();
  await p.getByRole("button", { name: /^Supprimer Tâche 200/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: "Supprimer la tâche" }).click(); await p.waitForTimeout(1000);
  ok(etat.check_notes.filter((x) => x.atelier).length === 0, "toutes les questions supprimées");
  await p.getByRole("button", { name: "Retour à mes notes" }).click();
  // Images : photo jointe à la création, compressée puis envoyée ; retirée avec la note supprimée
  await p.locator("textarea").first().fill("Note avec photo");
  await p.locator("[data-fichier-form]").setInputFiles({ name: "capture.png", mimeType: "image/png", buffer: PNG });
  await p.locator("[data-form-image]").waitFor({ timeout: 5000 });
  await p.getByRole("button", { name: "Ajouter", exact: true }).first().click(); await p.waitForTimeout(800);
  const nImg = etat.check_notes.find((x) => x.texte === "Note avec photo");
  ok(!!nImg && nImg.images.length === 1 && fichiers.length === 1 && fichiers[0].startsWith(nImg.id + "/"), "image : envoyée et rattachée à la note");
  ok(await p.locator("[data-note]", { hasText: "Note avec photo" }).locator("[data-images] img").first().isVisible(), "image : miniature affichée sur la note");
  await shot(p, "09-image");
  // la note d'essai disparait de la base simulée, puis la page est rechargée (le reste du parcours repart de l'état d'avant)
  etat.check_notes = etat.check_notes.filter((x) => x !== nImg); fichiers.length = 0;
  await p.reload(); await p.waitForLoadState("networkidle");
  ok(await p.getByText(/Réglée le/).first().isVisible(), "Alice voit la note réglée par Bob");
  ok(await p.locator("[data-reponse]", { hasText: "Sikaflex" }).first().isVisible(), "Alice voit la réponse de Bob");

  // 7. Corbeille avec annulation
  const avant = await lignesNotes(p).count();
  await lignesNotes(p).filter({ hasText: "Rendez-vous garage" }).getByRole("button", { name: "Mettre à la corbeille" }).click();
  await p.waitForTimeout(600);
  ok((await lignesNotes(p).count()) === avant - 1, "note mise à la corbeille");
  await p.getByRole("button", { name: "Annuler" }).click(); await p.waitForTimeout(800);
  ok((await lignesNotes(p).count()) === avant, "« Annuler » la ramène");
  await lignesNotes(p).filter({ hasText: "Rendez-vous garage" }).getByRole("button", { name: "Mettre à la corbeille" }).click(); await p.waitForTimeout(600);
  await p.getByRole("tab", { name: /Corbeille/ }).click();
  ok((await lignesNotes(p).count()) === 1, "visible dans la corbeille");
  await p.getByRole("button", { name: "Restaurer la note" }).click(); await p.waitForTimeout(600);
  ok(!etat.check_notes.find((x) => x.texte === "Rendez-vous garage").supprime_le, "restaurée depuis la corbeille");
  await p.getByRole("tab", { name: "Actives" }).click();

  // 8. PDF, sauvegarde, a propos
  const dl = p.waitForEvent("download", { timeout: 15000 });
  await p.getByRole("button", { name: "PDF", exact: true }).click();
  const pdf = await dl;
  ok(/^check-rapport-de-suivi-.*\.pdf$/.test(pdf.suggestedFilename()), `PDF téléchargé (${pdf.suggestedFilename()})`);
  await pdf.saveAs(`${out}/rapport.pdf`);
  const dlc = p.waitForEvent("download", { timeout: 15000 });
  await p.getByRole("button", { name: "PDF en couleurs" }).click();
  const pdfc = await dlc;
  ok(/-couleur\.pdf$/.test(pdfc.suggestedFilename()), `PDF en couleurs téléchargé (${pdfc.suggestedFilename()})`);
  await pdfc.saveAs(`${out}/rapport-couleur.pdf`);
  await p.getByRole("button", { name: "Raccourcis" }).click();
  ok(await p.getByRole("heading", { name: "Raccourcis clavier" }).isVisible(), "liste des raccourcis affichée");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Sauvegarde" }).click();
  const dl2 = p.waitForEvent("download");
  await p.getByRole("button", { name: "Télécharger" }).click();
  const sauvegarde = JSON.parse(fs.readFileSync(await (await dl2).path(), "utf8"));
  ok(sauvegarde.app === "check" && sauvegarde.notes.length === 4, "sauvegarde téléchargée (4 notes)");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: /À propos/ }).click();
  ok(await p.getByText("Conçu et développé par Hugo N.").isVisible(), "fenêtre À propos");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);

  // 8b. Telephone : pas de debordement, cibles tactiles >= 40 px
  etape = "mobile";
  const pm = await page({ largeur: 390 });
  await pm.goto(URL0); await pm.waitForLoadState("networkidle");
  await seConnecter(pm, "alice@exemple.ch");
  await shot(pm, "07-mobile");
  const mesure = await pm.evaluate(() => ({
    debord: document.documentElement.scrollWidth - window.innerWidth,
    petits: [...document.querySelectorAll("[data-note] button")].filter((x) => x.offsetParent && (x.getBoundingClientRect().width < 40 || x.getBoundingClientRect().height < 36)).length,
  }));
  ok(mesure.debord <= 0, `mobile : aucun débordement horizontal (${mesure.debord} px)`);
  ok(mesure.petits === 0, `mobile : boutons des notes assez grands (${mesure.petits} trop petits)`);

  // 9. Accessibilite, sombre, selecteur
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe.violations.length === 0, `accessibilité : ${axe.violations.length} problème(s)${axe.violations.map((v) => ` [${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}]`).join("")}`);
  const p3 = await page({ dark: true });
  await p3.goto(URL0); await p3.waitForLoadState("networkidle");
  await seConnecter(p3, "bob@exemple.ch");
  await shot(p3, "06-sombre");
  const axe2 = await new AxeBuilder({ page: p3 }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axe2.violations.length === 0, `accessibilité (sombre) : ${axe2.violations.length} problème(s)${axe2.violations.map((v) => ` [${v.id}: ${v.nodes.length} ${v.nodes[0]?.target}]`).join("")}`);
  await p3.getByRole("button", { name: "Changer d'application" }).click();
  const menu = await p3.getByRole("menuitem").allTextContents();
  ok(menu.length === 11 && /^Accueil/.test(menu[0] ?? ""), `sélecteur : Accueil puis 10 applis (${menu.length})`);

} catch (e) {
  ok(false, `arret du check-up : ${e.message.split("\n")[0]}`);
  for (const [i, x] of pages.entries()) await x.screenshot({ path: `${out}/echec-${i}.png`, fullPage: true }).catch(() => {});
}
await b.close();
