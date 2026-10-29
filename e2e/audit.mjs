// Audit Check : parcours dans un navigateur avec des notes fictives (stockage du navigateur).
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const out = process.argv[2] || "out";
const notes = [];
const log = (s) => { notes.push(s); console.log(s); fs.writeFileSync(`${out}/checkup.txt`, notes.join("\n") + "\n"); };
process.on("unhandledRejection", (e) => log("ARRET " + String(e).split("\n")[0]));
const J = 86400000, now = Date.now();
const iso = (d) => new Date(now + d * J).toISOString().slice(0, 10);
const seed = [
  { id: "a", text: "Vérifier les ancrages HFT niveau 3 avec l'ingénieur", category: "Chantier 1", status: "todo", dueDate: iso(-2), createdAt: now - 5 * J, archived: false, flash: true },
  { id: "b", text: "Relancer Schüco pour les profilés de l'imposte", category: "Chantier 1", status: "waiting", dueDate: iso(1), createdAt: now - 3 * J, archived: false },
  { id: "c", text: "Mettre à jour la liste de fabrication indice B", category: "Chantier 2", status: "in_progress", dueDate: null, createdAt: now - 2 * J, archived: false },
  { id: "d", text: "Commande tôles pliées envoyée", category: "Chantier 2", status: "done", dueDate: null, createdAt: now - 10 * J, completedAt: now - 9 * J, archived: false },
  { id: "e", text: "Rendez-vous médecin", category: "Perso", status: "todo", dueDate: iso(6), createdAt: now - J, archived: false },
];
const b = await chromium.launch();
for (const dark of [false, true]) { try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(([s, d]) => { if (!localStorage.getItem("dp-notes-v1")) localStorage.setItem("dp-notes-v1", s); if (d) localStorage.setItem("theme", "dark"); }, [JSON.stringify(seed), dark]);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => log(`ERREUR JS ${e.message}`));
  const t0 = Date.now();
  await p.goto("http://127.0.0.1:8080"); await p.waitForLoadState("networkidle");
  log(`${dark ? "sombre" : "clair"} : chargement ${Date.now() - t0} ms, titre="${await p.title()}" lang=${await p.getAttribute("html", "lang")}`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${dark ? "02-sombre" : "01-clair"}.png`, fullPage: true });
  const axe = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze();
  log(`accessibilite ${dark ? "sombre" : "clair"} : ${axe.violations.map((v) => `${v.id}(${v.nodes.length})`).join(", ") || "rien"}`);
  if (!dark) {
    await p.getByPlaceholder("Rechercher une note…").fill("schuco");
    log(`recherche "schuco" (sans trema) -> ${await p.locator("main ul > li").count()} note(s)`);
    await p.getByPlaceholder("Rechercher une note…").fill("");
    const dl = p.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    const pop = p.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
    await p.getByRole("button", { name: /Exporter en PDF/ }).click();
    const [d, w] = await Promise.all([dl, pop]);
    log(`PDF : ${d ? "telecharge " + d.suggestedFilename() : w ? "ouvert dans un onglet" : "rien"}`);
    if (d) { await d.saveAs(`${out}/notes.pdf`); }
    const texte = await p.getByPlaceholder(/Écrivez votre note/).count();
    log(`formulaire present : ${texte}`);
    await p.getByRole("button", { name: /Gérer/ }).click(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/03-categories.png` });
    await p.keyboard.press("Escape");
    // suppression sans confirmation ?
    await p.locator("main ul > li").first().hover();
    await p.locator("main ul > li").first().getByTitle("Supprimer").click(); await p.waitForTimeout(400);
    log(`suppression : ${(await p.getByRole("alertdialog").count()) ? "confirmation demandee" : "immediate, sans confirmation ni annulation"} -> ${await p.locator("main ul > li").count()} note(s)`);
    log(`stockage : ${(await p.evaluate(() => (localStorage.getItem("dp-notes-v1") || "").length))} caracteres dans le navigateur`);
  }
  await ctx.close();
} catch (e) { log("ARRET " + String(e.message).split("\n")[0]); } }
await b.close();
fs.writeFileSync(`${out}/checkup.txt`, notes.join("\n") + "\n");
