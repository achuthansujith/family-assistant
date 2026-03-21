"use client";
import { useState } from "react";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiSummaryInline({ householdId, userId }: { householdId: string; userId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    if (summary) { setOpen(o => !o); return; }
    setLoading(true); setOpen(true);
    try {
      const res = await fetch("/api/ai/summary", { method: "POST" });
      const data = await res.json();
      setSummary(data.summary);
      setAiPowered(data.ai_powered);
    } catch {
      setSummary("Could not load summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-brand-50 to-white overflow-hidden">
      <button onClick={load} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <Sparkles size={15} className="text-brand-500 shrink-0" />
        <span className="text-sm font-medium text-brand-700 flex-1">Daily summary</span>
        {loading
          ? <Loader2 size={14} className="animate-spin text-brand-400" />
          : <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>
      {open && summary && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
          {!aiPowered && <p className="text-xs text-gray-400 mt-1">Deterministic summary</p>}
        </div>
      )}
    </div>
  );
}