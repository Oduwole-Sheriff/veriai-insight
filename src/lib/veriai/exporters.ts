import type { VerificationResult } from "./types";

function download(filename: string, content: string | Blob, mime: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportJson(result: VerificationResult) {
  download(`veriai-${Date.now()}.json`, JSON.stringify(result, null, 2), "application/json");
}

export function exportCsv(result: VerificationResult) {
  const rows: string[] = [];
  rows.push(["Type", "Text", "Status", "Confidence", "Domain", "URL"].map(csvCell).join(","));
  for (const c of result.claims) {
    rows.push(["claim", c.text, c.status, c.confidence, "", ""].map(csvCell).join(","));
  }
  for (const s of result.sources) {
    rows.push(["source", s.title, s.status, s.trustScore, s.domain, s.url].map(csvCell).join(","));
  }
  download(`veriai-${Date.now()}.csv`, rows.join("\n"), "text/csv");
}

export function exportMarkdown(result: VerificationResult) {
  const lines: string[] = [];
  lines.push(`# VeriAI Verification Report`);
  lines.push(`*Generated ${new Date(result.createdAt).toLocaleString()} — mode: ${result.mode}*`);
  lines.push("");
  lines.push(`**Overall confidence:** ${result.overallConfidence}%  `);
  lines.push(`**Hallucination risk:** ${result.hallucinationRisk}%`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(result.summary);
  lines.push("");
  lines.push(`## Claims`);
  for (const c of result.claims) {
    lines.push(`### ${c.status} — ${c.confidence}%`);
    lines.push(`> ${c.text}`);
    if (c.reasoning) lines.push(`**Reasoning:** ${c.reasoning}`);
    if (c.agreement?.length) lines.push(`**Agreement:** ${c.agreement.join("; ")}`);
    if (c.contradiction?.length) lines.push(`**Contradiction:** ${c.contradiction.join("; ")}`);
    lines.push("");
  }
  lines.push(`## Sources`);
  result.sources.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.title}](${s.url}) — ${s.domain} (trust ${s.trustScore}, ${s.status})`);
  });
  download(`veriai-${Date.now()}.md`, lines.join("\n"), "text/markdown");
}

export async function exportPdf(result: VerificationResult) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  const line = (text: string, size = 11, bold = false, gap = 4) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const parts = doc.splitTextToSize(text, width);
    for (const p of parts) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(p, margin, y);
      y += size + gap;
    }
  };

  line("VeriAI Verification Report", 18, true, 6);
  line(`Generated ${new Date(result.createdAt).toLocaleString()} — mode: ${result.mode}`, 9, false, 10);
  line(`Overall confidence: ${result.overallConfidence}%   Hallucination risk: ${result.hallucinationRisk}%`, 11, true, 10);
  line("Summary", 13, true, 4);
  line(result.summary, 11, false, 12);

  line("Claims", 13, true, 6);
  result.claims.forEach((c, i) => {
    line(`${i + 1}. [${c.status} · ${c.confidence}%] ${c.text}`, 11, true, 2);
    if (c.reasoning) line(`Reasoning: ${c.reasoning}`, 10, false, 2);
    if (c.agreement?.length) line(`Agreement: ${c.agreement.join("; ")}`, 10, false, 2);
    if (c.contradiction?.length) line(`Contradiction: ${c.contradiction.join("; ")}`, 10, false, 6);
    y += 4;
  });

  line("Sources", 13, true, 6);
  result.sources.forEach((s, i) => {
    line(`${i + 1}. ${s.title}`, 11, true, 2);
    line(`${s.domain} · trust ${s.trustScore} · ${s.status}`, 9, false, 2);
    line(s.url, 9, false, 6);
  });

  doc.save(`veriai-${Date.now()}.pdf`);
}
