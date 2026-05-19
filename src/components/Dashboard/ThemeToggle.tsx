import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={toggle}
      className="group inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card/60 backdrop-blur transition-all hover:scale-105 hover:bg-accent"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500 transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
}
