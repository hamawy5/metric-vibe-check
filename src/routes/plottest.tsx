import { createFileRoute } from "@tanstack/react-router";
import { MathGraph } from "@/components/MathGraph";

export const Route = createFileRoute("/plottest")({
  component: PlotTest,
  head: () => ({
    meta: [
      { title: "Graph renderer test | MatricPulse" },
      { name: "description", content: "Internal check for the centered Cartesian math graph renderer." },
    ],
  }),
});

function PlotTest() {
  return (
    <div className="space-y-8 p-4">
      <MathGraph spec={{ title: "y = 2^x", functions: [{ fn: "2^x", color: "#22d3ee", label: "y = 2^x" }] }} />
      <MathGraph spec={{ title: "y = 1/x", functions: [{ fn: "1/x", color: "#fbbf24", label: "y = 1/x" }] }} />
      <MathGraph
        spec={{
          title: "Shifted view",
          xRange: [-2, 10],
          yRange: [-4, 8],
          functions: [{ fn: "sin(x)", color: "#a78bfa", label: "y = \\sin x" }],
        }}
      />
    </div>
  );
}
