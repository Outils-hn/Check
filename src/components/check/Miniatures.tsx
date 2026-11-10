import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUrlsImages } from "@/lib/images";

/** Images jointes a une note : miniatures cliquables, agrandies dans une fenetre (avec « Retirer » si on peut modifier). */
export function Miniatures({ chemins, modifiable, onRetirer }: { chemins: string[]; modifiable: boolean; onRetirer: (chemin: string) => void }) {
  const urls = useUrlsImages(chemins);
  const [ouverte, setOuverte] = useState<string | null>(null);
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
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Image jointe</DialogTitle><DialogDescription className="sr-only">Image de la note, en grand</DialogDescription></DialogHeader>
          {ouverte && urls[ouverte] && <img src={urls[ouverte]} alt="Image jointe à la note, en grand" className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md object-contain" />}
          {modifiable && ouverte && <DialogFooter><Button variant="destructive" onClick={() => { onRetirer(ouverte); setOuverte(null); }}>Retirer l'image</Button></DialogFooter>}
        </DialogContent>
      </Dialog>
    </>
  );
}
