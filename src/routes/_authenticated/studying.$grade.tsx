import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/studying/$grade")({
  head: ({ params }) => ({
    meta: [
      { title: `Grade ${params.grade} Subjects — MatricPulse AI` },
      { name: "description", content: `Subjects for Grade ${params.grade}.` },
    ],
  }),
  loader: ({ params }) => {
    if (!["9", "10", "11", "12"].includes(params.grade)) throw notFound();
  },

  component: () => <Outlet />,
});
