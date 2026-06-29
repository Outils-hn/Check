import { useEffect, useState } from "react";
import { CATS_KEY, NOTES_KEY } from "@/lib/notes-storage";
import { HardDrive } from "lucide-react";

// Conservative localStorage quota assumption (most browsers ~5 Mo)
const QUOTA_BYTES = 5 * 1024 * 1024;

function byteSize(str: string) {
  // UTF-16: localStorage stores strings as UTF-16, 2 bytes per code unit
  return str.length * 2;
}

function computeUsage() {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (const key of [NOTES_KEY, CATS_KEY]) {
    const v = localStorage.getItem(key);
    if (v) total += byteSize(key) + byteSize(v);
  }
  return total;
}

interface Props {
  // deps trigger recompute when notes/cats change
  deps: unknown[];
}

export function StorageGauge({ deps }: Props) {
  const [bytes, setBytes] = useState(0);

  useEffect(() => {
    setBytes(computeUsage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const pct = Math.min(100, (bytes / QUOTA_BYTES) * 100);
  const mb = bytes / (1024 * 1024);
  const quotaMb = QUOTA_BYTES / (1024 * 1024);

  let barColor = "bg-emerald-500";
  let textTone = "text-muted-foreground";
  if (pct >= 85) {
    barColor = "bg-red-500";
    textTone = "text-red-600 font-medium";
  } else if (pct >= 70) {
    barColor = "bg-amber-500";
    textTone = "text-amber-600 font-medium";
  }

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="size-3.5" />
          Stockage
        </span>
        <span className={textTone}>
          {mb.toFixed(1)} Mo / {quotaMb.toFixed(1)} Mo ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
