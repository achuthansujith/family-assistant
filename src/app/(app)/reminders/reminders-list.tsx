"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, isOverdue, cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, X } from "lucide-react";
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
    await supabase.from("reminders").update({ status: "done" }).eq("id", id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: "done" } : r));
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
    toast({ title: "Reminder set", variant: "success" });
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="w-full">
        <Plus size={16} /> Add Reminder
      </Button>

      {showAdd && (
        <form onSubmit={addReminder} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <Input label="What to remember" value={title} onChange={e => setTitle(e.target.value)} required />
          <Input label="When" type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} required />
          <div>
            <label className="text-sm font-medium text-gray-700">For</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              <option value="">Myself</option>
              {members.filter(m => m.user_id !== userId).map((m: any) => (
                <option key={m.user_id} value={m.user_id}>{m.profile?.display_name ?? "Partner"}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">Set Reminder</Button>
        </form>
      )}

      <div className="space-y-2">
        {pending.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No pending reminders</p>}
        {pending.map(r => (
          <Card key={r.id} className="flex items-start gap-3">
            <button onClick={() => markDone(r.id)} className="mt-0.5">
              <Circle size={22} className="text-gray-300" />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium">{r.title}</p>
              <p className={cn("text-xs mt-0.5", isOverdue(r.due_at) ? "text-red-500" : "text-gray-400")}>
                {formatDateTime(r.due_at)}
              </p>
              {r.assignee && <p className="text-xs text-brand-500 mt-0.5">For {r.assignee.display_name}</p>}
            </div>
            {isOverdue(r.due_at) && <Badge variant="danger">Overdue</Badge>}
          </Card>
        ))}
      </div>

      {done.length > 0 && (
        <div className="opacity-60 space-y-2">
          <p className="text-xs font-medium text-gray-400">Done ({done.length})</p>
          {done.slice(0, 3).map(r => (
            <Card key={r.id} className="flex items-center gap-3 py-2">
              <CheckCircle2 size={22} className="text-green-400" />
              <p className="text-sm line-through text-gray-400">{r.title}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
