"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IcsImport } from "./ics-import";
import { formatDateTime } from "@/lib/utils";
import { Plus, MapPin, Calendar, Trash2, Lock, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

const CATEGORIES = ["appointment","school","family","travel","bill_payment","other"] as const;
const RECURRENCE_TYPES = ["none","daily","weekly","monthly","custom"] as const;
const catColors: Record<string, "info"|"warning"|"success"|"danger"|"default"> = {
  appointment: "info", school: "success", family: "default",
  travel: "warning", bill_payment: "danger", other: "default",
};

const defaultForm = {
  title: "", starts_at: "", ends_at: "", location: "", category: "other",
  description: "", visibility: "shared",
  recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: "",
};

export function EventsList({ initialEvents, householdId, userId, members }: {
  initialEvents: any[];
  householdId: string;
  userId: string;
  members: any[];
}) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  function f(key: string, val: any) { setForm(prev => ({ ...prev, [key]: val })); }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at) return;
    setLoading(true);

    const seriesId = form.recurrence_type !== "none"
      ? crypto.randomUUID()
      : null;

    const { data, error } = await supabase.from("events").insert({
      household_id: householdId,
      title: form.title.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location: form.location || null,
      category: form.category,
      description: form.description || null,
      visibility: form.visibility,
      recurrence_type: form.recurrence_type,
      recurrence_interval: form.recurrence_type === "custom" ? form.recurrence_interval : 1,
      recurrence_end_date: form.recurrence_end_date || null,
      recurrence_series_id: seriesId,
      created_by: userId,
      attendee_ids: [userId],
    }).select().single();

    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setEvents(prev => [...prev, data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    setForm(defaultForm);
    setShowAdd(false);
    toast({ title: "Event added", variant: "success" });
  }

  async function deleteEvent(ev: any) {
    if (ev.recurrence_series_id) {
      const choice = window.confirm(
        "This is a recurring event.\n\nOK = delete entire series\nCancel = delete this event only"
      );
      if (choice) {
        await supabase.from("events").delete().eq("recurrence_series_id", ev.recurrence_series_id);
        setEvents(prev => prev.filter(e => e.recurrence_series_id !== ev.recurrence_series_id));
        toast({ title: "Series deleted" });
        return;
      }
    }
    const { error } = await supabase.from("events").delete().eq("id", ev.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setEvents(prev => prev.filter(e => e.id !== ev.id));
    toast({ title: "Event deleted" });
  }

  function handleImported(imported: any[]) {
    setEvents(prev =>
      [...prev, ...imported].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    );
  }

  function recurrenceLabel(ev: any) {
    if (!ev.recurrence_type || ev.recurrence_type === "none") return null;
    if (ev.recurrence_type === "custom") return `every ${ev.recurrence_interval}d`;
    return ev.recurrence_type;
  }

  return (
    <div className="px-4 py-4 space-y-3 pb-28">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Event
      </Button>

      <IcsImport householdId={householdId} userId={userId} onImported={handleImported} />

      {showAdd && (
        <form onSubmit={addEvent} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Input label="Title" value={form.title} onChange={e => f("title", e.target.value)} required />
          <Input label="Start" type="datetime-local" value={form.starts_at} onChange={e => f("starts_at", e.target.value)} required />
          <Input label="End (optional)" type="datetime-local" value={form.ends_at} onChange={e => f("ends_at", e.target.value)} />
          <Input label="Location" value={form.location} onChange={e => f("location", e.target.value)} placeholder="Optional" />

          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select value={form.category} onChange={e => f("category", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="text-sm font-medium text-gray-700">Visibility</label>
            <div className="mt-1 flex gap-2">
              {(["shared","private"] as const).map(v => (
                <button key={v} type="button"
                  onClick={() => f("visibility", v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm transition-colors ${
                    form.visibility === v
                      ? "border-brand-400 bg-brand-50 text-brand-700 font-medium"
                      : "border-gray-200 text-gray-500"
                  }`}>
                  {v === "shared" ? <Users size={14} /> : <Lock size={14} />}
                  {v === "shared" ? "Family" : "Private"}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="text-sm font-medium text-gray-700">Repeat</label>
            <select value={form.recurrence_type} onChange={e => f("recurrence_type", e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {RECURRENCE_TYPES.map(r => <option key={r} value={r}>{r === "none" ? "Does not repeat" : r}</option>)}
            </select>
          </div>

          {form.recurrence_type === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Every</span>
              <input type="number" min={1} max={365} value={form.recurrence_interval}
                onChange={e => f("recurrence_interval", parseInt(e.target.value))}
                className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <span className="text-sm text-gray-600">days</span>
            </div>
          )}

          {form.recurrence_type !== "none" && (
            <Input label="End date (optional)" type="date" value={form.recurrence_end_date}
              onChange={e => f("recurrence_end_date", e.target.value)} />
          )}

          <Button type="submit" loading={loading} className="w-full">Add Event</Button>
        </form>
      )}

      {events.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No upcoming events</p>}

      <div className="space-y-2">
        {events.map(ev => (
          <Card key={ev.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {ev.visibility === "private"
                    ? <Lock size={11} className="text-gray-400 shrink-0" />
                    : <Users size={11} className="text-gray-400 shrink-0" />}
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>{formatDateTime(ev.starts_at)}</span>
                  {recurrenceLabel(ev) && (
                    <span className="flex items-center gap-0.5 ml-1 text-brand-400">
                      <RefreshCw size={10} />{recurrenceLabel(ev)}
                    </span>
                  )}
                </div>
                {ev.location && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <MapPin size={12} />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={catColors[ev.category] ?? "default"}>{ev.category.replace("_", " ")}</Badge>
                <button onClick={() => deleteEvent(ev)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}