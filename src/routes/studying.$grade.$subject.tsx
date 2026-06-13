import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/studying/$grade/$subject")({
  component: () => <Outlet />,
});
