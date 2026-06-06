import { useCallback, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { SAMPLES } from "@/lib/veriai/engine";
import { useClickOutside } from "@/hooks/useClickOutside";

interface SamplesDropdownProps {
  onSelect: (content: string) => void;
}

export function SamplesDropdown({ onSelect }: SamplesDropdownProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(open, close);

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="
          inline-flex
          w-full
          sm:w-auto
          items-center
          justify-center
          gap-2
          rounded-lg
          border
          border-border
          bg-background/60
          px-4
          py-2
          text-sm
          font-medium
          text-foreground
          transition-all
          hover:border-indigo-500/40
          hover:bg-accent
        "
      >
        <FileText className="h-4 w-4" />
        Load Sample Dataset
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="
            absolute
            left-0
            right-0
            sm:left-auto
            sm:right-0
            z-1000
            mt-2
            w-full
            sm:w-80
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-popover
            shadow-2xl
            animate-in
            fade-in
            slide-in-from-top-2
          "
        >
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              role="menuitem"
              onClick={() => {
                onSelect(s.content);
                close();
              }}
              className="
                block
                w-full
                border-b
                border-border/60
                px-4
                py-3
                text-left
                text-sm
                transition-colors
                last:border-b-0
                hover:bg-accent
              "
            >
              <div className="font-medium text-foreground">
                {s.name}
              </div>

              <div className="mt-0.5 text-xs text-muted-foreground">
                {s.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
