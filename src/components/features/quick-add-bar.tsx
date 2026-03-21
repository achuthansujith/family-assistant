"use client";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toaster";

// householdId no longer needed - API derives it from session
export function QuickAddBar({ onResult }: {
  onResult?: (result: any) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
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
      onResult?.(data);
      setText("");
      toast({ title: "Got it!", description: `Parsed as ${data.result.type}`, variant: "success" });
    } catch (err) {
      toast({ title: "Could not parse", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm px-3 py-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder='Try "Buy milk and eggs" or "Doctor Friday 3pm"'
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className={cn(
          "p-1.5 rounded-xl transition-colors",
          text.trim() ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
        )}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      </button>
    </form>
  );
}
