export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Calendar, CheckSquare, Bell, ChefHat } from "lucide-react";
import Link from "next/link";

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
  const weekStartDate = format(today, "yyyy-MM-dd");
  const weekEndDate = format(addDays(today, 6), "yyyy-MM-dd");

  const [chores, events, reminders, meals] = await Promise.all([
    supabase.from("chores").select("id,title,due_date,priority,status")
      .eq("household_id", hid).in("status", ["pending", "snoozed"])
      .gte("due_date", weekStartDate).lte("due_date", weekEndDate),
    supabase.from("events").select("id,title,starts_at,category")
      .eq("household_id", hid).gte("starts_at", weekStart).lte("starts_at", weekEnd),
    supabase.from("reminders").select("id,title,due_at")
      .eq("household_id", hid).eq("status", "pending")
      .gte("due_at", weekStart).lte("due_at", weekEnd),
    supabase.from("meal_plans").select("id,meal_name,slot,plan_date")
      .eq("household_id", hid).gte("plan_date", weekStartDate).lte("plan_date", weekEndDate),
  ]);

  return (
    <div>
      <AppHeader title="Weekly Planner" />
      <div className="px-4 py-4 space-y-5 pb-28">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayChores = chores.data?.filter(c => c.due_date === dayStr) ?? [];
          const dayEvents = events.data?.filter(e => e.starts_at.startsWith(dayStr)) ?? [];
          const dayReminders = reminders.data?.filter(r => r.due_at.startsWith(dayStr)) ?? [];
          const dayMeals = meals.data?.filter(m => m.plan_date === dayStr) ?? [];
          const hasItems = dayChores.length + dayEvents.length + dayReminders.length + dayMeals.length > 0;
          const isToday = dayStr === format(today, "yyyy-MM-dd");

          return (
            <div key={dayStr}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${isToday ? "text-brand-600" : "text-gray-700"}`}>
                  {format(day, "EEE")}
                </span>
                <span className={`text-sm ${isToday ? "text-brand-500" : "text-gray-400"}`}>
                  {format(day, "d MMM")}
                </span>
                {isToday && <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-medium">Today</span>}
                {!hasItems && <span className="text-xs text-gray-300 ml-1">Free</span>}
              </div>
              {hasItems && (
                <div className="space-y-1.5 pl-3 border-l-2 border-gray-100 ml-1">
                  {dayEvents.map(e => (
                    <Link key={e.id} href="/events">
                      <div className="flex items-center gap-2 text-sm py-0.5">
                        <Calendar size={13} className="text-purple-400 shrink-0" />
                        <span className="text-gray-700">{e.title}</span>
                      </div>
                    </Link>
                  ))}
                  {dayChores.map(c => (
                    <Link key={c.id} href="/chores">
                      <div className="flex items-center gap-2 text-sm py-0.5">
                        <CheckSquare size={13} className="text-brand-400 shrink-0" />
                        <span className="text-gray-700 flex-1">{c.title}</span>
                        {c.priority === "high" && <Badge variant="danger" className="text-[10px] py-0">!</Badge>}
                      </div>
                    </Link>
                  ))}
                  {dayReminders.map(r => (
                    <Link key={r.id} href="/reminders">
                      <div className="flex items-center gap-2 text-sm py-0.5">
                        <Bell size={13} className="text-yellow-400 shrink-0" />
                        <span className="text-gray-700">{r.title}</span>
                      </div>
                    </Link>
                  ))}
                  {dayMeals.length > 0 && (
                    <Link href="/meals">
                      <div className="flex items-center gap-2 text-sm py-0.5">
                        <ChefHat size={13} className="text-orange-400 shrink-0" />
                        <span className="text-gray-500 text-xs">
                          {dayMeals.map(m => `${m.slot}: ${m.meal_name}`).join("  ")}
                        </span>
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
