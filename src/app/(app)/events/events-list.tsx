"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IcsImport } from "./ics-import";
import { formatDateTime, cn } from "@/lib/utils";
import { Plus, MapPin, Calendar, Trash2, Lock, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toaster";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";

const CATEGORIES = ["appointment","school","family","travel","bill_payment","other"] as const;
const RECURRENCE_TYPES = ["none","daily","weekly","monthly","custom"] as const;
const catColors: Record<string, "info"|"warning"|"success"|"danger"|"default"> = {
  appointment: "info", school: "success", family: "default",
  travel: "warning", bill_payment: "danger", other: "default",
};
const catDots: Record<string, string> = {
  appointment: "bg-blue-400", school: "bg-green-400", family: "bg-purple-400",
  travel: "bg-orange-400", bill_payment: "bg-red-400", other: "bg-brand-300",
};

const defaultForm = {
  title: "", starts_at: "", ends_at: "", location: "", category: "other",
  description: "", visibility: "shared",
  recurrence_type: "none", recurrence_interval: 1, recurrence_end_date: "",
};

function dateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isThisWeek(d)) return format(d, "EEEE");
  return format(d, "d MMM yyyy");
}

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

    const seriesId = form.recurrence_type !== "none" ? crypto.randomUUID() : null;

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
    toast({ title: "Event added 📅", variant: "success" });
  }

  async function deleteEvent(ev: any) {
    if (ev.recurrence_series_id) {
      const choice = window.confirm("Delete entire series? OK = yes, Cancel = this event only");
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

  // Group events by date
  const grouped: Record<string, any[]> = {};
  for (const ev of events) {
    const key = format(new Date(ev.starts_at), "yyyy-MM-dd");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  const inputClass = cn(
    "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-brand-400"
  );

  return (
    <div className="px-4 py-4 space-y-3 pb-28">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Event
      </Button>

      <IcsImport householdId={householdId} userId={userId} onImported={handleImported} />

      {showAdd && (
        <form onSubmit={addEvent} className="bg-white rounded-2xl border border-brand-100 p-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Title</label>
            <input value={form.title} onChange={e => f("title", e.target.value)} required
              className={inputClass} placeholder="Event name" autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Start</label>
            <input type="datetime-local" value={form.starts_at} onChange={e => f("starts_at", e.target.value)} required className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">End (optional)</label>
            <input type="datetime-local" value={form.ends_at} onChange={e => f("ends_at", e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Location</label>
            <input value={form.location} onChange={e => f("location", e.target.value)} placeholder="Optional" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Category</label>
            <select value={form.category} onChange={e => f("category", e.target.value)} className={inputClass}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Visibility</label>
            <div className="flex gap-2">
              {(["shared","private"] as const).map(v => (
                <button key={v} type="button" onClick={() => f("visibility", v)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm transition-colors",
                    form.visibility === v
                      ? "border-brand-400 bg-brand-50 text-brand-700 font-medium"
                      : "border-brand-100 text-brand-400 bg-white"
                  )}>
                  {v === "shared" ? <Users size={14} /> : <Lock size={14} />}
                  {v === "shared" ? "Family" : "Private"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Repeat</label>
            <select value={form.recurrence_type} onChange={e => f("recurrence_type", e.target.value)} className={inputClass}>
              {RECURRENCE_TYPES.map(r => <option key={r} value={r}>{r === "none" ? "Does not repeat" : r}</option>)}
            </select>
          </div>
          {form.recurrence_type === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-600">Every</span>
              <input type="number" min={1} max={365} value={form.recurrence_interval}
                onChange={e => f("recurrence_interval", parseInt(e.target.value))}
                className={cn(inputClass, "w-20")} />
              <span className="text-sm text-brand-600">days</span>
            </div>
          )}
          {form.recurrence_type !== "none" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-brand-700">End date (optional)</label>
              <input type="date" value={form.recurrence_end_date} onChange={e => f("recurrence_end_date", e.target.value)} className={inputClass} />
            </div>
          )}
          <Button type="submit" loading={loading} className="w-full">Add Event</Button>
        </form>
      )}

      {events.length === 0 && (
        <EmptyState emoji="📅" title="No upcoming events" description="Add events to your family calendar" />
      )}

      {/* Date-grouped list */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([dateKey, dayEvents]) => (
          <div key={dateKey}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">
              {dateLabel(dateKey + "T12:00:00")}
            </p>
            <div className="space-y-2">
              {dayEvents.map(ev => (
                <Card key={ev.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", catDots[ev.category] ?? "bg-brand-300")} />
                        <div className="flex items-center gap-1">
                          {ev.visibility === "private"
                            ? <Lock size={11} className="text-brand-300 shrink-0" />
                            : <Users size={11} className="text-brand-300 shrink-0" />}
                          <p className="text-sm font-medium text-brand-800 truncate">{ev.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-brand-400 ml-4">
                        <Calendar size={12} />
                        <span>{formatDateTime(ev.starts_at)}</span>
                        {recurrenceLabel(ev) && (
                          <span className="flex items-center gap-0.5 ml-1 text-brand-400">
                            <RefreshCw size={10} />{recurrenceLabel(ev)}
                          </span>
                        )}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-brand-400 ml-4">
                          <MapPin size={12} />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={catColors[ev.category] ?? "default"}>{ev.category.replace("_", " ")}</Badge>
                      <button onClick={() => deleteEvent(ev)}
                        className="text-brand-200 hover:text-red-400 transition-colors p-1 min-w-[36px] min-h-[36px] flex items-center justify-center">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
