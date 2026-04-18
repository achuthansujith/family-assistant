"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, isOverdue, cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toaster";

export function RemindersList({ initialReminders, householdId, userId, members }: {
  initialReminders: any[];
  householdId: string;
  userId: string;
  members: any[];
}) {
  const [reminders, setReminders] = useState<any[]>(initialReminders);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const pending = reminders.filter(r => r.status === "pending");
  const done = reminders.filter(r => r.status === "done");

  async function markDone(id: string) {
    const prev = [...reminders];
    setReminders(r => r.map(x => x.id === id ? { ...x, status: "done" } : x));
    await supabase.from("reminders").update({ status: "done" }).eq("id", id);
    toast({
      title: "Reminder done!",
      variant: "success",
      onUndo: () => {
        setReminders(prev);
        supabase.from("reminders").update({ status: "pending" }).eq("id", id);
      },
    });
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    setLoading(true);
    const { data, error } = await supabase.from("reminders").insert({
      household_id: householdId,
      title: title.trim(),
      due_at: new Date(dueAt).toISOString(),
      assigned_to: assignedTo || null,
      created_by: userId,
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    setReminders(prev => [data, ...prev]);
    setTitle(""); setDueAt(""); setAssignedTo(""); setShowAdd(false);
    toast({ title: "Reminder set ⏰", variant: "success" });
  }

  const inputClass = cn(
    "w-full rounded-xl border border-brand-100 bg-brand-50 px-3 py-2.5 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-brand-300"
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Reminder
      </Button>

      {showAdd && (
        <form onSubmit={addReminder} className="bg-white rounded-2xl border border-brand-100 p-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">Remind me to…</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Book dentist appointment"
              autoFocus
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">When</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-brand-700">For</label>
            <select
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              className={inputClass}
            >
              <option value="">Myself</option>
              {members.filter(m => m.user_id !== userId).map((m: any) => (
                <option key={m.user_id} value={m.user_id}>{m.profile?.display_name ?? "Partner"}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">Set Reminder</Button>
        </form>
      )}

      {pending.length === 0 && done.length === 0 ? (
        <EmptyState emoji="⏰" title="No reminders yet" description="Add something to be reminded about" />
      ) : (
        <>
          <div className="space-y-2">
            {pending.length === 0 && <EmptyState emoji="✅" title="All done!" description="No pending reminders" />}
            {pending.map(r => (
              <Card key={r.id} className="flex items-start gap-3">
                <button
                  onClick={() => markDone(r.id)}
                  className="mt-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                >
                  <Circle size={22} className="text-brand-200" />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-800">{r.title}</p>
                  <p className={cn("text-xs mt-0.5", isOverdue(r.due_at) ? "text-red-500" : "text-brand-400")}>
                    {formatDateTime(r.due_at)}
                  </p>
                  {r.assignee && (
                    <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100 mt-1 inline-block">
                      For {r.assignee.display_name}
                    </span>
                  )}
                </div>
                {isOverdue(r.due_at) && <StatusBadge status="overdue" />}
              </Card>
            ))}
          </div>

          {done.length > 0 && (
            <div className="opacity-60 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Done ({done.length})</p>
              {done.slice(0, 3).map(r => (
                <Card key={r.id} className="flex items-center gap-3 py-2">
                  <CheckCircle2 size={22} className="text-green-400 shrink-0" />
                  <p className="text-sm line-through text-brand-300">{r.title}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
