"use client";
import { useState } from "react";
import { Plus, Loader2, Check, X, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { createClient } from "@/lib/supabase/client";

type ParsedResult = {
  type: "chore" | "reminder" | "grocery" | "event" | "unknown";
  confidence: number;
  data: any;
};

const TYPE_LABELS: Record<string, string> = {
  chore: "Chore", reminder: "Reminder", grocery: "Grocery", event: "Event", unknown: "Unknown",
};
const TYPE_COLORS: Record<string, string> = {
  chore: "bg-blue-50 text-blue-700 border-blue-200",
  reminder: "bg-yellow-50 text-yellow-700 border-yellow-200",
  grocery: "bg-green-50 text-green-700 border-green-200",
  event: "bg-purple-50 text-purple-700 border-purple-200",
  unknown: "bg-gray-50 text-gray-600 border-gray-200",
};

export function QuickAddBar({ onSaved }: { onSaved?: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ result: ParsedResult; source: string } | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPreview(data);
    } catch (err) {
      toast({ title: "Could not parse", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch("/api/quick-add/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: preview.result }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast({ title: "Saved!", description: `${TYPE_LABELS[preview.result.type]} added`, variant: "success" });
      setText("");
      setPreview(null);
      onSaved?.();
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setPreview(null);
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleParse} className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='Try "Buy milk" or "Doctor Friday 3pm" or "Clean kitchen daily"'
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className={`p-1.5 rounded-xl transition-colors ${text.trim() ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"}`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </form>

      {preview && (
        <div className={`rounded-2xl border p-3 space-y-2 ${TYPE_COLORS[preview.result.type]}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">{TYPE_LABELS[preview.result.type]}</span>
            <span className="text-xs opacity-60">{Math.round(preview.result.confidence * 100)}% confident</span>
          </div>
          <PreviewContent result={preview.result} />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white bg-opacity-60 hover:bg-opacity-100 rounded-xl py-2 text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button
              onClick={handleDiscard}
              className="flex items-center justify-center gap-1.5 px-4 bg-white bg-opacity-40 hover:bg-opacity-80 rounded-xl py-2 text-sm transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewContent({ result }: { result: ParsedResult }) {
  if (result.type === "grocery") {
    const items = Array.isArray(result.data) ? result.data : [result.data];
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item: any, i: number) => (
          <span key={i} className="text-xs bg-white bg-opacity-60 rounded-full px-2 py-0.5">
            {item.quantity ? `${item.quantity} ` : ""}{item.name}
          </span>
        ))}
      </div>
    );
  }
  if (result.type === "chore") {
    return (
      <div className="text-sm">
        <p className="font-medium">{result.data.title}</p>
        {result.data.due_date && <p className="text-xs opacity-70 mt-0.5">Due: {result.data.due_date}</p>}
        {result.data.recurrence_rule && <p className="text-xs opacity-70">Repeats: {result.data.recurrence_rule}</p>}
      </div>
    );
  }
  if (result.type === "reminder") {
    return (
      <div className="text-sm">
        <p className="font-medium">{result.data.title}</p>
        {result.data.due_at && <p className="text-xs opacity-70 mt-0.5">At: {new Date(result.data.due_at).toLocaleString()}</p>}
      </div>
    );
  }
  if (result.type === "event") {
    return (
      <div className="text-sm">
        <p className="font-medium">{result.data.title}</p>
        {result.data.starts_at && <p className="text-xs opacity-70 mt-0.5">{new Date(result.data.starts_at).toLocaleString()}</p>}
      </div>
    );
  }
  return <p className="text-sm opacity-70">{result.data?.raw ?? "Unknown item"}</p>;
}