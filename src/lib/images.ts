import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/base";

// Images des notes : compressees dans le navigateur avant l'envoi, rangees dans le stockage prive « check-images ».
export const BUCKET = "check-images";
export const MAX_IMAGES = 3;
const COTE_MAX = 1600;
const POIDS_MAX = 400 * 1024;

/** Reduit l'image (1600 px au plus) et l'encode en WebP (ou JPEG si le navigateur ne sait pas), sous ~400 Ko. */
export async function compresser(fichier: Blob): Promise<Blob> {
  let source: ImageBitmap | HTMLImageElement;
  let largeur: number, hauteur: number;
  try { const b = await createImageBitmap(fichier); source = b; largeur = b.width; hauteur = b.height; }
  catch {
    const url = URL.createObjectURL(fichier);
    try {
      const img = new Image(); img.src = url; await img.decode();
      source = img; largeur = img.naturalWidth; hauteur = img.naturalHeight;
    } finally { URL.revokeObjectURL(url); }
  }
  let echelle = Math.min(1, COTE_MAX / Math.max(largeur, hauteur));
  let qualite = 0.8;
  for (let essai = 0; essai < 6; essai++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(largeur * echelle)); c.height = Math.max(1, Math.round(hauteur * echelle));
    c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
    let blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", qualite));
    if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", qualite));
    if (blob && (blob.size <= POIDS_MAX || essai === 5)) return blob;
    qualite = Math.max(0.5, qualite - 0.1); echelle *= 0.85;
  }
  throw new Error("Compression impossible");
}

export const extension = (b: Blob) => (b.type === "image/jpeg" ? "jpg" : b.type === "image/png" ? "png" : "webp");

/** Liens temporaires (1 h) pour afficher les images d'une note. */
export function useUrlsImages(chemins: string[]) {
  const q = useQuery({
    queryKey: ["check", "images", ...chemins], enabled: chemins.length > 0, staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.storage.from(BUCKET).createSignedUrls(chemins, 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((d: { path: string; signedUrl: string }) => [d.path, d.signedUrl])) as Record<string, string>;
    },
  });
  return q.data ?? {};
}
