export type StatTone = "emerald" | "rose" | "amber";

interface StatBoxProps {
  label: string;
  value: number;
  tone: StatTone;
}

const TONE_CLASSES: Record<StatTone, string> = {
  emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
};

export function StatBox({ label, value, tone }: StatBoxProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${TONE_CLASSES[tone]}`}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
