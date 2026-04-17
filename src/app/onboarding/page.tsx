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
    window.location.href = "/dashboard";
  }

  async function joinHousehold() {
    const code = inviteCode.trim();
    if (!code) { setError("Please enter an invite code"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/household/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Invalid code. Ask your partner to share it from Settings.");
      setLoading(false);
      return;
    }
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
              <p className="text-sm text-gray-500">Start fresh, invite your partner later</p>
            </div>
          </button>
          <button onClick={() => setMode("join")}
            className="w-full bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:border-brand-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Users size={24} className="text-green-500" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Join household</p>
              <p className="text-sm text-gray-500">Enter the invite code from Settings</p>
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
        {mode === "join" && (
          <p className="text-sm text-gray-500 text-center">
            Find the code in your partner&apos;s app under Settings  Household
          </p>
        )}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
          {mode === "create" ? (
            <Input label="Household name" value={householdName} onChange={e => setHouseholdName(e.target.value)} />
          ) : (
            <Input
              label="Invite code"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="e.g. abc12345"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          )}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <Button
            onClick={mode === "create" ? createHousehold : joinHousehold}
            loading={loading} className="w-full" size="lg"
          >
            {mode === "create" ? "Create household" : "Join household"}
          </Button>
          <button onClick={() => { setMode("choose"); setError(""); }} className="w-full text-sm text-gray-400">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

