import { createFileRoute } from "@tanstack/react-router";
import NotesApp from "@/components/NotesApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHECK — Notes & tâches techniques" },
      {
        name: "description",
        content:
          "CHECK : application industrielle de notes et tâches pour dessinateur projeteur en bâtiment.",
      },
      { property: "og:title", content: "CHECK" },
      {
        property: "og:description",
        content: "Notes & tâches techniques pour le dessinateur projeteur.",
      },
    ],
  }),
  component: NotesApp,
});
