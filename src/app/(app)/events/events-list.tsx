"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IcsImport } from "./ics-import";
import { formatDateTime } from "@/lib/utils";
import { Plus, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

const CATEGORIES = ["appointment","school","family","travel","bill_payment","other"] as const;
const catColors: Record<string, "info"|"warning"|"success"|"danger"|"default"> = {
  appointment: "info", school: "success", family: "default",
  travel: "warning", bill_payment: "danger", other: "default",
};

export function EventsList({ initialEvents, householdId, userId, members }: {
  initialEvents: any[];
  householdId: string;
  userId: string;
  members: any[];
}) {
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", starts_at: "", ends_at: "", location: "", category: "other", description: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at) return;
    setLoading(true);
    const { data, error } = await supabase.from("events").insert({
      household_id: householdId,
      title: form.title.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location: form.location || null,
      category: form.category,
      description: form.description || null,
      created_by: userId,
      attendee_ids: [userId],
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setEvents(prev => [...prev, data].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()));
    setForm({ title: "", starts_at: "", ends_at: "", location: "", category: "other", description: "" });
    setShowAdd(false);
    toast({ title: "Event added", variant: "success" });
  }

  function handleImported(imported: any[]) {
    setEvents(prev =>
      [...prev, ...imported].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Event
      </Button>

      <IcsImport householdId={householdId} userId={userId} onImported={handleImported} />

      {showAdd && (
        <form onSubmit={addEvent} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
          <Input label="Start" type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({...f, starts_at: e.target.value}))} required />
          <Input label="End (optional)" type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({...f, ends_at: e.target.value}))} />
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Optional" />
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">Add Event</Button>
        </form>
      )}

      {events.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No upcoming events</p>}

      <div className="space-y-2">
        {events.map(ev => (
          <Card key={ev.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{ev.title}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>{formatDateTime(ev.starts_at)}</span>
                </div>
                {ev.location && (
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <MapPin size={12} />
                    <span>{ev.location}</span>
                  </div>
                )}
              </div>
              <Badge variant={catColors[ev.category] ?? "default"}>{ev.category.replace("_", " ")}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}