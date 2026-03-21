"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { X } from "lucide-react";

export function AddChoreModal({ householdId, userId, members, onClose, onAdded }: {
  householdId: string;
  userId: string;
  members: any[];
  onClose: () => void;
  onAdded: (chore: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [recurrence, setRecurrence] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("chores").insert({
      household_id: householdId,
      title: title.trim(),
      due_date: dueDate || null,
      priority,
      recurrence_rule: recurrence || null,
      assignee_id: assigneeId || null,
      created_by: userId,
    }).select().single();

    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "error" }); return; }
    onAdded(data);
    toast({ title: "Chore added", variant: "success" });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Add Chore</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Vacuum living room" required />
          <Input label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Repeat</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Assign to</label>
            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              <option value="">Unassigned</option>
              {members.map((m: any) => (
                <option key={m.user_id} value={m.user_id}>{m.profile?.display_name ?? m.user_id}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">Add Chore</Button>
        </form>
      </div>
    </div>
  );
}
