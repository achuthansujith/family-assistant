export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { QuickAddBar } from "@/components/features/quick-add-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Calendar, ShoppingCart, Bell, ChefHat, Sparkles } from "lucide-react";
import { AiSummaryInline } from "@/components/features/ai-summary-inline";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: member } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user!.id)
    .single();

  if (!member) redirect("/onboarding");
  const hid = member.household_id;
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [overdueChores, todayChores, completedToday, todayEvents, pendingReminders, groceries, todayMeals] = await Promise.all([
    supabase.from("chores").select("id,title,due_date,priority")
      .eq("household_id", hid).eq("status", "pending").lt("due_date", todayStr).limit(5),
    supabase.from("chores").select("id,title,priority")
      .eq("household_id", hid).eq("status", "pending").eq("due_date", todayStr).limit(8),
    supabase.from("chore_completions").select("id,chore_id,chores(title)")
      .gte("completed_at", startOfDay(today).toISOString())
      .lte("completed_at", endOfDay(today).toISOString()).limit(5),
    supabase.from("events").select("id,title,starts_at,category")
      .eq("household_id", hid)
      .gte("starts_at", startOfDay(today).toISOString())
      .lte("starts_at", endOfDay(addDays(today, 7)).toISOString())
      .order("starts_at").limit(5),
    supabase.from("reminders").select("id,title,due_at")
      .eq("household_id", hid).eq("status", "pending")
      .lte("due_at", endOfDay(today).toISOString()).limit(5),
    supabase.from("grocery_items").select("id,name,category,need_soon")
      .eq("household_id", hid).eq("purchased", false).order("need_soon", { ascending: false }).limit(8),
    supabase.from("meal_plans").select("id,meal_name,slot")
      .eq("household_id", hid).eq("plan_date", todayStr).order("slot"),
  ]);

  const catColors: Record<string, string> = {
    appointment: "text-blue-500", school: "text-green-500",
    family: "text-purple-500", travel: "text-orange-500",
    bill_payment: "text-red-500", other: "text-gray-400",
  };

  return (
    <div>
      <AppHeader title="Family Assistant AI" />
      <div className="px-4 py-4 space-y-4 pb-28">
        <QuickAddBar />

        {/* AI Summary */}
        <AiSummaryInline householdId={hid} userId={user!.id} />

        {/* Overdue */}
        {(overdueChores.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-600">Overdue ({overdueChores.data?.length})</span>
            </div>
            <div className="space-y-2">
              {overdueChores.data?.map(c => (
                <Link key={c.id} href="/chores">
                  <Card className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">{c.title}</span>
                    <Badge variant="danger">{formatDate(c.due_date!)}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Today chores */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-700">Today</span>
          </div>
          {(todayChores.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 py-1">Nothing due today</p>
          ) : (
            <div className="space-y-2">
              {todayChores.data?.map(c => (
                <Link key={c.id} href="/chores">
                  <Card className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium">{c.title}</span>
                    <Badge variant={c.priority === "high" ? "danger" : c.priority === "medium" ? "warning" : "default"}>
                      {c.priority}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Today meals */}
        {(todayMeals.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat size={16} className="text-orange-500" />
              <span className="text-sm font-semibold text-gray-700">Meals today</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {todayMeals.data?.map(m => (
                <Link key={m.id} href="/meals">
                  <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full border border-orange-100">
                    {m.slot}: {m.meal_name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Reminders */}
        {(pendingReminders.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} className="text-yellow-500" />
              <span className="text-sm font-semibold text-gray-700">Reminders</span>
            </div>
            <div className="space-y-2">
              {pendingReminders.data?.map(r => (
                <Link key={r.id} href="/reminders">
                  <Card className="py-3">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.due_at)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {(todayEvents.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">Upcoming (7 days)</span>
            </div>
            <div className="space-y-2">
              {todayEvents.data?.map(e => (
                <Link key={e.id} href="/events">
                  <Card className="py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-current ${catColors[e.category] ?? "text-gray-400"}`} />
                      <p className="text-sm font-medium flex-1">{e.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-4">{formatDateTime(e.starts_at)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Groceries */}
        {(groceries.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart size={16} className="text-green-500" />
              <span className="text-sm font-semibold text-gray-700">Shopping</span>
            </div>
            <Link href="/groceries">
              <Card className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  {groceries.data?.slice(0, 6).map(g => (
                    <span key={g.id} className={`text-xs px-2 py-0.5 rounded-full ${g.need_soon ? "bg-red-50 text-red-600 font-medium" : "bg-gray-100 text-gray-600"}`}>
                      {g.name}
                    </span>
                  ))}
                  {(groceries.data?.length ?? 0) > 6 && (
                    <span className="text-xs text-gray-400">+{(groceries.data?.length ?? 0) - 6} more</span>
                  )}
                </div>
              </Card>
            </Link>
          </section>
        )}

        {/* Completed today */}
        {(completedToday.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-400">Done today ({completedToday.data?.length})</span>
            </div>
            <div className="space-y-1">
              {completedToday.data?.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 px-1 py-1">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span className="text-sm text-gray-400 line-through">{c.chores?.title ?? "Chore"}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
