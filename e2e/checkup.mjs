// Check-up Check dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// La simulation reproduit les regles de la base : notes perso pour leur auteur, notes de projet pour l'equipe.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const out = process.argv[2] || "out";
const URL0 = "http://127.0.0.1:8080";
const SB = "https://ngfzwfbraqkdcocdcmib.supabase.co";
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
const etat = { check_projets: [], check_membres: [], check_notes: [] };
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const valide = (u) => !!u && !!parId(u)?.[1].valide;
const membre = (u, p) => etat.check_membres.some((m) => m.projet_id === p && m.user_id === u);
const voit = (t, u, r) => valide(u) && (
  t === "check_projets" ? membre(u, r.id) || r.cree_par === u
  : t === "check_membres" ? membre(u, r.projet_id)
  : r.projet_id === null ? r.auteur === u : membre(u, r.projet_id));
const filtres = (url) => [...url.searchParams.entries()].filter(([k, v]) => !["select", "order", "limit"].includes(k) && v.startsWith("eq.")).map(([k, v]) => [k, v.slice(3)]);
const correspond = (r, f) => f.every(([k, v]) => String(r[k]) === v);
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
          Object.assign(x, { statut: "todo", flash: false, archive: false, ordre: 0, pour: null, echeance: null, supprime_le: null, regle_le: null, ...x });
          const e = controleNote(x, null); if (e) return json({ code: "P0001", message: e }, 400);
        }
      }
      etat[t].push(...rows);
      if (t === "check_projets") rows.forEach((p) => { etat.check_membres.push({ projet_id: p.id, user_id: moi }); lignes.push(`NOTE projet cree « ${p.nom} » a l'etape ${etape}`); });
      return json(unique ? rows[0] : rows, 201);
    }
    const cibles = etat[t].filter((x) => voit(t, moi, x) && correspond(x, f));
    if (m === "PATCH") {
      for (const x of cibles) { const avant = { ...x }; Object.assign(x, corps); if (t === "check_notes") { const e = controleNote(x, avant); if (e) { Object.assign(x, avant); return json({ code: "P0001", message: e }, 400); } } }
      return json([], 200);
    }
    if (m === "DELETE") { etat[t] = etat[t].filter((x) => !cibles.includes(x)); return r.fulfill({ status: 204, body: "" }); }
    return json([]);
  });
}

const b = await chromium.launch();
const pages = [];
async function page({ dark = false, anciennes = null, largeur = 1440 } = {}) {
  const ctx = await b.newContext({ viewport: { width: largeur, height: largeur < 600 ? 800 : 900 }, acceptDownloads: true });
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
  ok(await p.getByText("Vos notes, sur tous vos postes").isVisible(), "sans compte : invitation à se connecter");
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
  await p2.getByRole("tab", { name: /Pour moi/ }).click();
  ok((await lignesNotes(p2).count()) === 1, "« Pour moi » : la note confiée");
  ok(await p2.getByText("par Alice Martin").isVisible(), "auteur affiché (« par Alice Martin »)");
  await p2.getByRole("button", { name: /Statut : À faire/ }).click(); await p2.waitForTimeout(400);
  await p2.getByRole("button", { name: /Statut : En cours/ }).click(); await p2.waitForTimeout(400);
  await p2.getByRole("button", { name: /Statut : En attente/ }).click(); await p2.waitForTimeout(800);
  ok(confiee.statut === "done" && !!confiee.regle_le, "Bob règle la note (statut en un clic)");
  await shot(p2, "05-bob");
  await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200);
  ok(await p.getByText(/Réglée le/).first().isVisible(), "Alice voit la note réglée par Bob");

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
  await p.getByRole("button", { name: "PDF" }).click();
  const pdf = await dl;
  ok(/^check-rapport-de-suivi-.*\.pdf$/.test(pdf.suggestedFilename()), `PDF téléchargé (${pdf.suggestedFilename()})`);
  await pdf.saveAs(`${out}/rapport.pdf`);
  await p.getByRole("button", { name: "Sauvegarde" }).click();
  const dl2 = p.waitForEvent("download");
  await p.getByRole("button", { name: "Télécharger" }).click();
  const sauvegarde = JSON.parse(fs.readFileSync(await (await dl2).path(), "utf8"));
  ok(sauvegarde.app === "check" && sauvegarde.notes.length === 4, "sauvegarde téléchargée (4 notes)");
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: /Conçu par/ }).click();
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
  ok((await p3.getByRole("menuitem").count()) === 8, "sélecteur : 8 applis");
} catch (e) {
  ok(false, `arret du check-up : ${e.message.split("\n")[0]}`);
  for (const [i, x] of pages.entries()) await x.screenshot({ path: `${out}/echec-${i}.png`, fullPage: true }).catch(() => {});
}
await b.close();
