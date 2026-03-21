"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Users } from "lucide-react";

export default function OnboardingPage() {
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [householdName, setHouseholdName] = useState("Our Home");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createHousehold() {
    setLoading(true); setError("");
    const res = await fetch("/api/household/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: householdName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to create household"); setLoading(false); return; }
    // Hard navigation so server layout re-runs with fresh session
    window.location.href = "/dashboard";
  }

  async function joinHousehold() {
    setLoading(true); setError("");
    const res = await fetch("/api/household/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Invalid code"); setLoading(false); return; }
    window.location.href = "/dashboard";
  }

  if (mode === "choose") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Set up your household</h1>
            <p className="text-gray-500 text-sm mt-1">Create a new one or join your partner</p>
          </div>
          <button onClick={() => setMode("create")}
            className="w-full bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <Home size={24} className="text-brand-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Create household</p>
              <p className="text-sm text-gray-500">Start fresh, invite your partner</p>
            </div>
          </button>
          <button onClick={() => setMode("join")}
            className="w-full bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Users size={24} className="text-green-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Join household</p>
              <p className="text-sm text-gray-500">Enter your partner&apos;s invite code</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center">
          {mode === "create" ? "Name your household" : "Enter invite code"}
        </h1>
        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
          {mode === "create" ? (
            <Input label="Household name" value={householdName} onChange={e => setHouseholdName(e.target.value)} />
          ) : (
            <Input label="Invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="e.g. abc12345" />
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            onClick={mode === "create" ? createHousehold : joinHousehold}
            loading={loading} className="w-full" size="lg"
          >
            {mode === "create" ? "Create Household" : "Join Household"}
          </Button>
          <button onClick={() => setMode("choose")} className="w-full text-sm text-gray-400">Back</button>
        </div>
      </div>
    </div>
  );
}