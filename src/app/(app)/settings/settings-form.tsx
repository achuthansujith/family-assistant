"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { Copy, Check, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function SettingsForm({ household, settings, members, aiLogs, userId, isOwner, notifPrefs }: {
  household: any;
  settings: any;
  members: any[];
  aiLogs: any[];
  userId: string;
  isOwner: boolean;
  notifPrefs: any;
}) {
  const [aiEnabled, setAiEnabled] = useState(settings?.ai_enabled ?? true);
  const [maxCalls, setMaxCalls] = useState(settings?.ai_max_calls_per_day ?? 5);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  const [morningEnabled, setMorningEnabled] = useState(notifPrefs?.morning_enabled ?? false);
  const [morningTime, setMorningTime] = useState(notifPrefs?.morning_time ?? "07:30");
  const [eveningEnabled, setEveningEnabled] = useState(notifPrefs?.evening_enabled ?? false);
  const [eveningTime, setEveningTime] = useState(notifPrefs?.evening_time ?? "20:00");
  const [aiSummaries, setAiSummaries] = useState(notifPrefs?.ai_summaries ?? false);

  const { toast } = useToast();
  const supabase = createClient();
  const { state: pushState, error: pushError, subscribe, unsubscribe } = usePushNotifications();

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("household_settings").upsert({
      household_id: household.id,
      ai_enabled: aiEnabled,
      ai_max_calls_per_day: maxCalls,
    });
    setSaving(false);
    if (error) toast({ title: "Error saving", variant: "error" });
    else toast({ title: "Settings saved", variant: "success" });
  }

  async function saveNotifPrefs() {
    setSavingNotif(true);
    const { error } = await supabase.from("user_notification_prefs").upsert({
      user_id: userId,
      morning_enabled: morningEnabled,
      morning_time: morningTime,
      evening_enabled: eveningEnabled,
      evening_time: eveningTime,
      ai_summaries: aiSummaries,
    }, { onConflict: "user_id" });
    setSavingNotif(false);
    if (error) toast({ title: "Error saving notifications", variant: "error" });
    else toast({ title: "Notification prefs saved", variant: "success" });
  }

  async function handlePushToggle() {
    if (pushState === "subscribed") {
      await unsubscribe();
      toast({ title: "Push notifications disabled", variant: "default" });
    } else {
      const ok = await subscribe();
      if (ok) toast({ title: "Push notifications enabled", variant: "success" });
      else toast({ title: pushError ?? "Could not enable notifications", variant: "error" });
    }
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const todayTokens = aiLogs
    .filter(l => l.created_at.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((sum, l) => sum + (l.total_tokens ?? 0), 0);

  return (
    <div className="px-4 py-4 space-y-5">
      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-800">Household</h2>
        <p className="text-sm text-gray-600">{household?.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded-lg flex-1">
            Invite code: {household?.invite_code}
          </span>
          <button onClick={copyInviteCode} className="p-2 rounded-lg bg-gray-100">
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-500" />}
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Members</p>
          {members.map((m: any) => (
            <div key={m.user_id} className="flex items-center justify-between">
              <span className="text-sm">{m.profile?.display_name ?? m.profile?.email}</span>
              <Badge variant={m.role === "owner" ? "info" : "default"}>{m.role}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold text-gray-800">Push Notifications</h2>
        {pushState === "unsupported" ? (
          <p className="text-sm text-gray-400">
            Not supported on this device. On iPhone, add the app to your Home Screen first, then come back here.
          </p>
        ) : pushState === "denied" ? (
          <p className="text-sm text-red-500">Permission denied. Go to your browser/phone settings and allow notifications for this site.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-xl ${pushState === "subscribed" ? "bg-green-100" : "bg-gray-100"}`}>
                {pushState === "subscribed"
                  ? <Bell size={18} className="text-green-600" />
                  : <BellOff size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {pushState === "subscribed" ? "Notifications are on" : "Notifications are off"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pushState === "subscribed"
                    ? "You will receive morning and evening summaries on this device."
                    : "Tap below to receive daily summaries on this device."}
                </p>
              </div>
            </div>
            <Button
              onClick={handlePushToggle}
              loading={pushState === "loading"}
              variant={pushState === "subscribed" ? "ghost" : "primary"}
              className={`w-full ${pushState === "subscribed" ? "text-red-500" : ""}`}
            >
              {pushState === "subscribed" ? "Disable push notifications" : "Enable push notifications"}
            </Button>
            {pushError && (
              <p className="text-xs text-red-500 text-center break-words">{pushError}</p>
            )}
            {!pushError && pushState === "prompt" && (
              <p className="text-xs text-gray-400 text-center">
                iPhone: make sure the app is added to your Home Screen first.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold text-gray-800">Daily Summaries</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Morning summary</p>
              <p className="text-xs text-gray-400">Overdue, today tasks, events, meals</p>
            </div>
            <button
              onClick={() => setMorningEnabled(!morningEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${morningEnabled ? "bg-brand-500" : "bg-gray-200"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${morningEnabled ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          {morningEnabled && (
            <div>
              <label className="text-xs text-gray-500">Send time</label>
              <input
                type="time" value={morningTime}
                onChange={e => setMorningTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Evening summary</p>
              <p className="text-xs text-gray-400">Completed, pending, tomorrow preview</p>
            </div>
            <button
              onClick={() => setEveningEnabled(!eveningEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${eveningEnabled ? "bg-brand-500" : "bg-gray-200"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${eveningEnabled ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          {eveningEnabled && (
            <div>
              <label className="text-xs text-gray-500">Send time</label>
              <input
                type="time" value={eveningTime}
                onChange={e => setEveningTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">AI-written summaries</p>
            <p className="text-xs text-gray-400">More natural language (uses AI quota)</p>
          </div>
          <button
            onClick={() => setAiSummaries(!aiSummaries)}
            className={`w-12 h-6 rounded-full transition-colors ${aiSummaries ? "bg-brand-500" : "bg-gray-200"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${aiSummaries ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
        <Button onClick={saveNotifPrefs} loading={savingNotif} className="w-full" variant="secondary">
          Save notification prefs
        </Button>
      </Card>

      {isOwner && (
        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-800">AI Settings</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Features</p>
              <p className="text-xs text-gray-400">Summaries and smart parsing</p>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${aiEnabled ? "bg-brand-500" : "bg-gray-200"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${aiEnabled ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Max AI calls per day</label>
            <input
              type="number" min={0} max={20} value={maxCalls}
              onChange={e => setMaxCalls(parseInt(e.target.value))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Keep at 3-5 to stay under 10 EUR/month</p>
          </div>
          <Button onClick={saveSettings} loading={saving} className="w-full" variant="secondary">
            Save settings
          </Button>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">AI Usage</h2>
          <span className="text-xs text-gray-400">Today: ~{todayTokens} tokens</span>
        </div>
        {aiLogs.length === 0 ? (
          <p className="text-sm text-gray-400">No AI calls yet</p>
        ) : (
          <div className="space-y-2">
            {aiLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{log.feature}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{log.total_tokens ?? 0} tokens</span>
                  <Badge variant={log.success ? "success" : "danger"}>{log.success ? "ok" : "err"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Button
        variant="ghost"
        className="w-full text-red-500"
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
      >
        Sign out
      </Button>
    </div>
  );
}