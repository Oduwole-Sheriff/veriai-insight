import { useEffect, useState } from "react";

interface Props {
  value: number; // 0-100
}

function colorFor(v: number): { stroke: string; text: string; label: string } {
  if (v >= 80) return { stroke: "stroke-emerald-500", text: "text-emerald-500", label: "High Confidence" };
  if (v >= 50) return { stroke: "stroke-amber-500", text: "text-amber-500", label: "Moderate Confidence" };
  return { stroke: "stroke-rose-500", text: "text-rose-500", label: "Low Confidence" };
}

export function ConfidenceGauge({ value }: Props) {
  const [display, setDisplay] = useState(0);
  const { stroke, text, label } = colorFor(value);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display;
    const to = value;
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-muted"
            strokeWidth="14"
            fill="none"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className={`${stroke} transition-[stroke-dashoffset] duration-700 ease-out`}
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-semibold tabular-nums ${text}`}>{display}</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</span>
        </div>
      </div>
      <span className={`text-sm font-medium ${text}`}>{label}</span>
    </div>
  );
}
