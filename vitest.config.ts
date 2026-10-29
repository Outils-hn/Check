import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests de la logique (filtres, tri, reprise, sauvegarde) : environnement Node, WebCrypto natif.
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
