import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard/Dashboard";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "VeriAI — AI Hallucination Detection for CS Students" },
      {
        name: "description",
        content:
          "VeriAI is a multi-source cross-verification dashboard that helps undergraduate Computer Science students detect hallucinations in AI-generated answers.",
      },
    ],
  }),
});

function Index() {
  return <Dashboard />;
}
