import { createFileRoute } from "@tanstack/react-router";
import NotesApp from "@/components/NotesApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carnet de chantier — Notes & tâches" },
      {
        name: "description",
        content:
          "Application rapide de prise de notes et gestion de tâches pour dessinateur projeteur en bâtiment.",
      },
      { property: "og:title", content: "Carnet de chantier" },
      {
        property: "og:description",
        content: "Notes & tâches optimisées pour le dessinateur projeteur.",
      },
    ],
  }),
  component: NotesApp,
});
