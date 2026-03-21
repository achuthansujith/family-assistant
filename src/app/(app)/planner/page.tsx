import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Calendar, CheckSquare, Bell } from "lucide-react";

export default async function PlannerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(today), i));
  const weekStart = startOfDay(today).toISOString();
  const weekEnd = endOfDay(addDays(today, 6)).toISOString();

  const [chores, events, reminders] = await Promise.all([
    supabase.from("chores").select("id,title,due_date,priority,status,assignee_id")
      .eq("household_id", hid).in("status", ["pending", "snoozed"])
      .gte("due_date", format(today, "yyyy-MM-dd"))
      .lte("due_date", format(addDays(today, 6), "yyyy-MM-dd")),
    supabase.from("events").select("id,title,starts_at,category")
      .eq("household_id", hid).gte("starts_at", weekStart).lte("starts_at", weekEnd),
    supabase.from("reminders").select("id,title,due_at,assigned_to")
      .eq("household_id", hid).eq("status", "pending")
      .gte("due_at", weekStart).lte("due_at", weekEnd),
  ]);

  return (
    <div>
      <AppHeader title="Weekly Planner" />
      <div className="px-4 py-4 space-y-4">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayChores = chores.data?.filter(c => c.due_date === dayStr) ?? [];
          const dayEvents = events.data?.filter(e => e.starts_at.startsWith(dayStr)) ?? [];
          const dayReminders = reminders.data?.filter(r => r.due_at.startsWith(dayStr)) ?? [];
          const hasItems = dayChores.length + dayEvents.length + dayReminders.length > 0;

          return (
            <div key={dayStr}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{formatDate(day)}</span>
                <span className="text-xs text-gray-400">{format(day, "EEE")}</span>
                {!hasItems && <span className="text-xs text-gray-300">Free day</span>}
              </div>
              {hasItems && (
                <div className="space-y-1.5 pl-2 border-l-2 border-gray-100">
                  {dayEvents.map(e => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-purple-400 flex-shrink-0" />
                      <span className="text-gray-700">{e.title}</span>
                    </div>
                  ))}
                  {dayChores.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <CheckSquare size={14} className="text-brand-400 flex-shrink-0" />
                      <span className="text-gray-700">{c.title}</span>
                      {c.priority === "high" && <Badge variant="danger" className="text-[10px]">!</Badge>}
                    </div>
                  ))}
                  {dayReminders.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <Bell size={14} className="text-yellow-400 flex-shrink-0" />
                      <span className="text-gray-700">{r.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
