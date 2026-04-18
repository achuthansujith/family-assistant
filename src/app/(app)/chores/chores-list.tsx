"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, RotateCcw } from "lucide-react";
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

  const overdue = filtered.filter(c => c.status === "pending" && c.due_date && isOverdue(c.due_date));
  const today = filtered.filter(c => {
    if (c.status !== "pending" || !c.due_date) return false;
    const d = new Date(c.due_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const upcoming = filtered.filter(c => {
    if (c.status !== "pending") return false;
    if (!c.due_date) return true;
    const d = new Date(c.due_date);
    const now = new Date();
    return d > now && d.toDateString() !== now.toDateString();
  });
  const done = filtered.filter(c => c.status === "done");

  async function markDone(chore: any) {
    const prev = [...chores];
    setChores(c => c.map(x => x.id === chore.id ? { ...x, status: "done" } : x));

    const { error } = await supabase.from("chore_completions").insert({
      chore_id: chore.id,
      completed_by: userId,
    });
    if (!error) {
      await supabase.from("chores").update({ status: "done" }).eq("id", chore.id);
      toast({
        title: "Chore done! 🎉",
        variant: "success",
        onUndo: () => {
          setChores(prev);
          markPending(chore);
        },
      });
    } else {
      setChores(prev);
    }
  }

  async function markPending(chore: any) {
    await supabase.from("chores").update({ status: "pending" }).eq("id", chore.id);
    setChores(c => c.map(x => x.id === chore.id ? { ...x, status: "pending" } : x));
  }

  function ChoreItem({ chore }: { chore: any }) {
    const status: "overdue" | "today" | "upcoming" | "done" =
      chore.status === "done" ? "done"
      : chore.due_date && isOverdue(chore.due_date) ? "overdue"
      : chore.due_date && new Date(chore.due_date).toDateString() === new Date().toDateString() ? "today"
      : "upcoming";

    return (
      <Card className="flex items-start gap-3">
        <button
          onClick={() => chore.status === "done" ? markPending(chore) : markDone(chore)}
          className="mt-0.5 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
        >
          {chore.status === "done"
            ? <CheckCircle2 size={22} className="text-green-500" />
            : <Circle size={22} className="text-brand-200" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium text-brand-800", chore.status === "done" && "line-through text-brand-300")}>
            {chore.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {chore.due_date && (
              <span className={cn("text-xs", status === "overdue" ? "text-red-500 font-medium" : "text-brand-400")}>
                {formatDate(chore.due_date)}
              </span>
            )}
            {chore.assignee?.display_name && (
              <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100">
                {chore.assignee.display_name}
              </span>
            )}
            {chore.recurrence_rule && <RotateCcw size={12} className="text-brand-300" />}
          </div>
        </div>
        <StatusBadge status={status} />
      </Card>
    );
  }

  function Section({ label, items }: { label: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">{label} ({items.length})</p>
        <div className="space-y-2">
          {items.map(c => <ChoreItem key={c.id} chore={c} />)}
        </div>
      </div>
    );
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
              "px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[36px]",
              filter === f ? "bg-brand-500 text-white" : "bg-white text-brand-600 border border-brand-100"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Button onClick={() => setShowAdd(true)} size="sm" className="w-full">
        <Plus size={16} /> Add Chore
      </Button>

      {filter === "pending" || filter === "all" || filter === "mine" ? (
        <div className="space-y-5">
          <Section label="Overdue" items={overdue} />
          <Section label="Today" items={today} />
          <Section label="Upcoming" items={upcoming} />
          {filter !== "pending" && <Section label="Done" items={done} />}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState emoji="✅" title="All done!" description="No completed chores yet" />
          ) : (
            filtered.map(c => <ChoreItem key={c.id} chore={c} />)
          )}
        </div>
      )}

      {filtered.length === 0 && filter === "pending" && (
        <EmptyState emoji="🎉" title="All caught up!" description="No pending chores" />
      )}

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
