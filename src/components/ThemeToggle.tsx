import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark = stored ? stored === "dark" : true;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-card/70 text-foreground shadow-lg backdrop-blur-xl transition hover:scale-105 active:scale-95"
    >
      <span
        className="relative flex h-5 w-5 items-center justify-center overflow-hidden"
        aria-hidden
      >
        <Sun
          className={`absolute h-5 w-5 text-amber-400 transition-all duration-300 ${
            isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          className={`absolute h-5 w-5 text-indigo-300 transition-all duration-300 ${
            isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
