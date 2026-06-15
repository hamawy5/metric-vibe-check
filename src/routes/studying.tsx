import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StreamGate } from "@/components/StreamGate";

export const Route = createFileRoute("/studying")({
  component: () => (
    <StreamGate>
      <Outlet />
    </StreamGate>
  ),
});
