import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StreamGate } from "@/components/StreamGate";

export const Route = createFileRoute("/_authenticated/studying")({
  component: () => (
    <StreamGate>
      <Outlet />
    </StreamGate>
  ),
});
