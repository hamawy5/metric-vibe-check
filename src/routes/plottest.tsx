import { createFileRoute } from "@tanstack/react-router";
import { MathGraph, parseMathGraphSpec } from "@/components/MathGraph";

export const Route = createFileRoute("/plottest")({
  component: () => {
    const spec = parseMathGraphSpec(
      '{"title":"Growth vs Decay","xRange":[-4,4],"yRange":[-1,8],"functions":[{"fn":"2^x","label":"y = 2^x (Growth)"},{"fn":"0.5^x","label":"y = (0.5)^x (Decay)"},{"fn":"1/x","label":"y = 1/x"}]}',
    );
    return <div className="p-3">{spec ? <MathGraph spec={spec} /> : "no spec"}</div>;
  },
});
