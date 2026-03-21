"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, RotateCcw } from "lucide-react";
import type { Chore } from "@/types";
import { useToast } from "@/components/ui/toaster";
import { AddChoreModal } from "./add-chore-modal";

const priorityVariant = { high: "danger", medium: "warning", low: "default" } as const;

export function ChoresList({ initialChores, householdId, userId, members }: {
  initialChores: any[];
  householdId: string;
  userId: string;
  members: any[];
}) {
  const [chores, setChores] = useState<any[]>(initialChores);
  const [filter, setFilter] = useState<"all" | "mine" | "pending" | "done">("pending");
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const filtered = chores.filter(c => {
    if (filter === "mine") return c.assignee_id === userId;
    if (filter === "pending") return c.status === "pending";
    if (filter === "done") return c.status === "done";
    return true;
  });

  async function markDone(chore: any) {
    const { error } = await supabase.from("chore_completions").insert({
      chore_id: chore.id,
      completed_by: userId,
    });
    if (!error) {
      await supabase.from("chores").update({ status: "done" }).eq("id", chore.id);
      setChores(prev => prev.map(c => c.id === chore.id ? { ...c, status: "done" } : c));
      toast({ title: "Chore done!", variant: "success" });
    }
  }

  async function markPending(chore: any) {
    await supabase.from("chores").update({ status: "pending" }).eq("id", chore.id);
    setChores(prev => prev.map(c => c.id === chore.id ? { ...c, status: "pending" } : c));
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["pending", "mine", "all", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
              filter === f ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowAdd(true)} size="sm" className="w-full">
        <Plus size={16} /> Add Chore
      </Button>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No chores here</p>
        )}
        {filtered.map(chore => (
          <Card key={chore.id} className="flex items-start gap-3">
            <button
              onClick={() => chore.status === "done" ? markPending(chore) : markDone(chore)}
              className="mt-0.5 flex-shrink-0"
            >
              {chore.status === "done"
                ? <CheckCircle2 size={22} className="text-green-500" />
                : <Circle size={22} className="text-gray-300" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", chore.status === "done" && "line-through text-gray-400")}>
                {chore.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {chore.due_date && (
                  <span className={cn("text-xs", isOverdue(chore.due_date) && chore.status !== "done" ? "text-red-500" : "text-gray-400")}>
                    {formatDate(chore.due_date)}
                  </span>
                )}
                {chore.assignee?.display_name && (
                  <span className="text-xs text-gray-400">{chore.assignee.display_name}</span>
                )}
                {chore.recurrence_rule && (
                  <RotateCcw size={12} className="text-gray-400" />
                )}
                <Badge variant={priorityVariant[chore.priority as keyof typeof priorityVariant]}>
                  {chore.priority}
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <AddChoreModal
          householdId={householdId}
          userId={userId}
          members={members}
          onClose={() => setShowAdd(false)}
          onAdded={(chore) => {
            setChores(prev => [chore, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
