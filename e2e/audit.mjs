// Check-up Check dans un vrai navigateur, avec une base Supabase SIMULEE (aucune donnee reelle).
// La simulation reproduit les regles de la base : notes perso pour leur auteur, notes de projet pour l'equipe.
import { chromium } from "playwright";
import { mesures, axe, tabsJusqua, focusVisible, note, tenter, ecrire } from "./audit-lib.mjs";
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

// ---------- Audit UX ----------
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
async function page({ w = 1440, h = 900, dark = false, anciennes = null, hors = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
  await ctx.addInitScript(([d, a]) => { if (d) localStorage.setItem("check-theme", "dark"); if (a && !localStorage.getItem("check-reprise-faite")) localStorage.setItem("dp-notes-v1", a); }, [dark, anciennes]);
  if (hors) await ctx.route(`${SB}/**`, (r) => r.abort()); else await brancher(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => note("erreurJS:" + Date.now(), e.message));
  const t0 = Date.now(); await p.goto(URL0, { waitUntil: "networkidle" }); p._chargement = Date.now() - t0; return p;
}
const shot = async (p, nom, pleine = true) => { await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${nom}.png`, fullPage: pleine }); };
const txt = async (p, sel = "body") => (await p.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ");
async function connecter(p, email, mdp = MDP) {
  await p.getByRole("button", { name: "Se connecter" }).first().click(); await p.getByLabel("Email").fill(email); await p.getByLabel("Mot de passe", { exact: true }).fill(mdp);
  await p.getByRole("dialog").getByRole("button", { name: "Se connecter" }).click(); await p.waitForTimeout(1500);
}
const J = 86400000;
const anc = JSON.stringify([{ id: "a1", text: "Vérifier les ancrages HFT niveau 3", category: "Chantier 1", status: "todo", dueDate: new Date(Date.now() - 2 * J).toISOString().slice(0, 10), createdAt: Date.now() - 5 * J, archived: false, flash: true }, { id: "a2", text: "Relancer Schüco pour l'imposte", category: "Chantier 1", status: "waiting", dueDate: null, createdAt: Date.now() - 3 * J, archived: false }, { id: "a3", text: "Rendez-vous garage", category: "Perso", status: "todo", dueDate: null, createdAt: Date.now() - J, archived: false }]);

let p = await page();
await tenter("sans-compte", async () => { await shot(p, "01-sans-compte", false); await mesures(p, "sans-compte"); await axe(p, "sans-compte"); note("sans-compte:texte", (await txt(p)).slice(0, 500)); note("focus", await focusVisible(p)); });
await tenter("mauvais-mdp", async () => { await connecter(p, "alice@exemple.ch", "faux"); await shot(p, "02-mauvais-mdp", false); note("mauvais-mdp", (await txt(p, "[role=dialog]")).slice(0, 300)); await p.keyboard.press("Escape"); });
await tenter("en-attente", async () => { const c = await page(); await connecter(c, "carl@exemple.ch"); await shot(c, "03-compte-en-attente", false); note("en-attente:texte", (await txt(c)).slice(0, 400)); });
await tenter("hors-ligne", async () => { const h = await page({ hors: true }); await shot(h, "04-hors-ligne", false); note("hors-ligne:texte", (await txt(h)).slice(0, 400)); });
p = await page({ anciennes: anc });
await tenter("connexion-reprise", async () => { await connecter(p, "alice@exemple.ch"); await shot(p, "05-reprise", false); note("reprise:texte", (await txt(p, "[role=dialog]")).slice(0, 400)); await p.getByRole("button", { name: "Importer", exact: true }).click(); await p.waitForTimeout(1500); await shot(p, "06-notes"); await mesures(p, "notes"); await axe(p, "notes"); });
await tenter("saisie", async () => {
  const champ = p.getByLabel("Texte de la note");
  for (const [nom, v] of [["vide", ""], ["espaces", "   "], ["balise", "<img src=x onerror=alert(1)> test"], ["long", "x".repeat(6000)], ["emoji", "Appeler 📞 le chef — 40 % fait ✅"]]) {
    await champ.fill(v); await champ.press("Enter"); await p.waitForTimeout(700);
    note(`note:${nom}`, { notes: await p.locator("[data-note]").count(), toasts: (await txt(p, "[role=status], [data-sonner-toast], .toast")).slice(0, 160) }); await shot(p, `07-note-${nom}`, false);
  }
});
await tenter("volume", async () => {
  const alice = "11111111-1111-4111-8111-111111111111";
  for (let i = 0; i < 1500; i++) etat.check_notes.push({ id: `v${i}`, created_at: new Date(Date.now() - i * 60000).toISOString(), texte: `Note de volume ${i} — contrôler le point ${i % 40}`, statut: ["todo", "waiting", "done"][i % 3], flash: i % 50 === 0, archive: false, ordre: i, pour: null, echeance: null, supprime_le: null, regle_le: null, projet_id: null, auteur: alice });
  const t0 = Date.now(); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  note("volume:1500-notes", { ms: Date.now() - t0, affichees: await p.locator("[data-note]").count() }); await shot(p, "08-volume", false);
  const t1 = Date.now(); await p.getByLabel("Rechercher une note").fill("point 7"); await p.waitForTimeout(300); note("volume:recherche-ms", Date.now() - t1);
});
await tenter("pdf", async () => { await p.getByLabel("Rechercher une note").fill(""); const bt = p.getByRole("button", { name: /PDF|Rapport/i }).first(); note("pdf:bouton", await bt.count()); });
note("boutons", (await p.getByRole("button").allInnerTexts()).map((s) => s.trim()).filter(Boolean).slice(0, 40).join(" | "));
for (const [nom, w, h] of [["mobile", 390, 844], ["tablette", 768, 1024]]) await tenter(nom, async () => { const m = await page({ w, h, anciennes: anc }); await shot(m, `09-${nom}-ouverture`); await mesures(m, nom); await connecter(m, "alice@exemple.ch"); await m.getByRole("button", { name: "Importer", exact: true }).click().catch(() => {}); await m.waitForTimeout(1200); await shot(m, `09-${nom}-notes`); await mesures(m, nom + "-connecte"); });
await tenter("sombre", async () => { const d = await page({ dark: true }); await connecter(d, "alice@exemple.ch"); await shot(d, "10-sombre", false); await axe(d, "sombre"); });
ecrire(); await b.close();
