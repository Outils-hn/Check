import { createFileRoute } from "@tanstack/react-router";
import NotesApp from "@/components/NotesApp";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Check — notes et tâches" }] }),
  component: NotesApp,
});
