"use client";
import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export default function AiSummaryPage() {
  const [summary, setSummary] = useState<string | null>(null);
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState<number | null>(null);
  const { toast } = useToast();

  async function generateSummary() {
    setLoading(true);
    try {
      // Get household_id from session - we fetch it server-side via API
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: "__current__" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSummary(data.summary);
      setAiPowered(data.ai_powered);
      setTokensUsed(data.tokens_used ?? null);
    } catch (err) {
      toast({ title: "Could not generate summary", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AppHeader title="AI Summary" />
      <div className="px-4 py-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50">
            <Sparkles size={28} className="text-brand-500" />
          </div>
          <p className="text-sm text-gray-500">Get a smart summary of your day</p>
        </div>

        <Button onClick={generateSummary} loading={loading} className="w-full" size="lg">
          <RefreshCw size={18} />
          {summary ? "Regenerate Summary" : "Generate Daily Summary"}
        </Button>

        {summary && (
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={aiPowered ? "text-brand-500" : "text-gray-400"} />
              <span className="text-xs font-medium text-gray-500">
                {aiPowered ? "AI-powered" : "Deterministic summary"}
              </span>
              {tokensUsed && (
                <span className="text-xs text-gray-300 ml-auto">~{tokensUsed} tokens</span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </Card>
        )}

        <p className="text-xs text-gray-400 text-center">
          Summaries use your household data only. AI calls are rate-limited to keep costs low.
        </p>
      </div>
    </div>
  );
}


