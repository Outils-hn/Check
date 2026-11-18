import { useEffect, useState } from "react";
import { Download, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUrlsImages } from "@/lib/images";

/** Images jointes a une note : miniatures cliquables, agrandies dans une fenetre (avec « Retirer » si on peut modifier). */
export function Miniatures({ chemins, modifiable, onRetirer }: { chemins: string[]; modifiable: boolean; onRetirer: (chemin: string) => void }) {
  const urls = useUrlsImages(chemins);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false); // false : image entiere dans la fenetre ; true : taille reelle, a faire defiler
  useEffect(() => { setZoom(false); }, [ouverte]);
  // Le lien est sur un autre domaine (l'attribut « download » serait ignore) et l'image est stockee en WebP, que beaucoup
  // de logiciels n'ouvrent pas : on la recupere en blob puis on la reencode en JPEG avant de la telecharger.
  const telecharger = async (chemin: string) => {
    try {
      const source = await createImageBitmap(await (await fetch(urls[chemin])).blob());
      const c = document.createElement("canvas");
      c.width = source.width; c.height = source.height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); // fond blanc si l'image est transparente
      ctx.drawImage(source, 0, 0);
      const jpg = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.95));
      if (!jpg) throw new Error("conversion");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(jpg); a.download = "check-image.jpg";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch { toast.error("L'image n'a pas pu être téléchargée."); }
  };
  if (!chemins.length) return null;
  return (
    <>
      <ul className="mt-1.5 flex flex-wrap gap-1.5" data-images>
        {chemins.map((p) => (
          <li key={p}>
            <button type="button" onClick={() => setOuverte(p)} aria-label="Agrandir l'image" className="block overflow-hidden rounded-md border border-border bg-muted">
              {urls[p] ? <img src={urls[p]} alt="Image jointe à la note" loading="lazy" className="h-16 w-auto max-w-[9rem] object-cover md:h-14" /> : <span className="block h-16 w-20 md:h-14" />}
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!ouverte} onOpenChange={(o) => !o && setOuverte(null)}>
        <DialogContent className={cn("max-w-3xl", zoom && "max-w-6xl")}>
          <DialogHeader><DialogTitle>Image jointe</DialogTitle><DialogDescription className="sr-only">Image de la note, en grand</DialogDescription></DialogHeader>
          {ouverte && urls[ouverte] && (
            <div className="max-h-[70vh] overflow-auto rounded-md">
              <img src={urls[ouverte]} alt="Image jointe à la note, en grand" onClick={() => setZoom((z) => !z)} title={zoom ? "Clic pour réduire" : "Clic pour voir en taille réelle"}
                className={cn("mx-auto rounded-md", zoom ? "max-w-none cursor-zoom-out" : "max-h-[70vh] w-auto max-w-full cursor-zoom-in object-contain")} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" aria-pressed={zoom} onClick={() => setZoom((z) => !z)}>{zoom ? <ZoomOut className="size-4" aria-hidden="true" /> : <ZoomIn className="size-4" aria-hidden="true" />}{zoom ? "Réduire" : "Taille réelle"}</Button>
              <Button variant="outline" onClick={() => ouverte && void telecharger(ouverte)}><Download className="size-4" aria-hidden="true" />Télécharger</Button>
            </div>
            {modifiable && ouverte && <Button variant="destructive" onClick={() => { onRetirer(ouverte); setOuverte(null); }}>Retirer l'image</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
