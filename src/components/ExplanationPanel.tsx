import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { ExplanationInput, ExplanationOutput } from "@/domain/explanation";
import { generateExplanation } from "@/domain/explanation";

interface ExplanationPanelProps {
  input: ExplanationInput | null;
}

/**
 * Optional AI-style explanation. Deliberately styled with amber accents and a
 * disclaimer so it is visually and textually distinct from the confirmed
 * booking status shown in ResultPanel.
 */
export function ExplanationPanel({ input }: ExplanationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<ExplanationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string>("");

  // Reset cached explanation when the input changes (e.g. new check result).
  const key = input
    ? `${input.roomLabel}|${input.startTime}|${input.endTime}|${input.reasonCode}|${input.isAvailable}`
    : "";
  if (input && key !== lastKey) {
    setLastKey(key);
    setOutput(null);
    setError(null);
  }

  async function handleExplain() {
    if (!input) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateExplanation(input);
      setOutput(result);
    } catch {
      setOutput(null);
      setError(
        "Couldn't generate an explanation. Please rely on the availability status above."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!input) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Explain availability
          </p>
        </div>
        <button
          type="button"
          onClick={handleExplain}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Explaining…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Explain
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {output && (
        <p className="mt-3 text-sm leading-relaxed text-amber-900">
          {output.explanation}
        </p>
      )}

      <p className="mt-3 border-t border-amber-200/70 pt-2 text-[11px] leading-snug text-amber-700/80">
        AI explanation is for guidance only and does not confirm or change the
        booking status shown above.
      </p>
    </div>
  );
}
