import type { jsPDF } from "jspdf";
// Polices livrees avec l'application (IBM Plex Sans, licence OFL) : elles sont servies
// par le meme site que l'appli, ou qu'elle soit hebergee, sans aucun service externe.
import sansUrl from "@/assets/fonts/IBMPlexSans-Regular.ttf?url";
import boldUrl from "@/assets/fonts/IBMPlexSans-SemiBold.ttf?url";

const sans = { url: sansUrl, original_filename: "plex-sans-Regular.ttf" };
const bold = { url: boldUrl, original_filename: "plex-sans-SemiBold.ttf" };

const fontData = new Map<string, Promise<string>>();
function loadFont(url: string) {
  const cached = fontData.get(url);
  if (cached) return cached;
  const promise = fetch(url).then(async response => {
    if (!response.ok) throw new Error("Les polices du PDF n’ont pas pu être chargées.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }).catch(error => { fontData.delete(url); throw error; });
  fontData.set(url, promise);
  return promise;
}

export async function installerPolicesPDF(doc: jsPDF) {
  await Promise.all([
    { asset: sans, family: "PlexSans", style: "normal" },
    { asset: bold, family: "PlexSans", style: "bold" },
  ].map(async ({ asset, family, style }) => {
    const data = await loadFont(asset.url);
    doc.addFileToVFS(asset.original_filename, data);
    doc.addFont(asset.original_filename, family, style);
  }));
  doc.setFont("PlexSans", "normal");
}