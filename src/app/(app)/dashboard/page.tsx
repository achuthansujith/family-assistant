export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { QuickAddBar } from "@/components/features/quick-add-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Calendar, ShoppingCart, Bell, ChefHat } from "lucide-react";
import { AiSummaryInline } from "@/components/features/ai-summary-inline";

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

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
  const hour = today.getHours();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const firstName = profile?.display_name?.split(" ")[0] ?? "";

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
    appointment: "bg-blue-400", school: "bg-green-400",
    family: "bg-purple-400", travel: "bg-orange-400",
    bill_payment: "bg-red-400", other: "bg-gray-300",
  };

  const totalPending = (overdueChores.data?.length ?? 0) + (todayChores.data?.length ?? 0);
  const greeting = getGreeting(hour);

  return (
    <div>
      <AppHeader
        title="Family Assistant"
        subtitle={firstName ? `${greeting}, ${firstName}` : greeting}
        userName={profile?.display_name ?? ""}
      />
      <div className="px-4 py-4 space-y-5 pb-28">
        <QuickAddBar />

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/chores">
            <div className="bg-white rounded-2xl border border-brand-100 p-3 text-center">
              <p className="text-2xl font-bold text-brand-500">{totalPending}</p>
              <p className="text-[10px] text-brand-600 font-medium uppercase tracking-wide mt-0.5">Chores</p>
            </div>
          </Link>
          <Link href="/groceries">
            <div className="bg-white rounded-2xl border border-brand-100 p-3 text-center">
              <p className="text-2xl font-bold text-brand-500">{groceries.data?.length ?? 0}</p>
              <p className="text-[10px] text-brand-600 font-medium uppercase tracking-wide mt-0.5">Grocery</p>
            </div>
          </Link>
          <Link href="/events">
            <div className="bg-white rounded-2xl border border-brand-100 p-3 text-center">
              <p className="text-2xl font-bold text-brand-500">{todayEvents.data?.length ?? 0}</p>
              <p className="text-[10px] text-brand-600 font-medium uppercase tracking-wide mt-0.5">Events</p>
            </div>
          </Link>
        </div>

        {/* AI Summary */}
        <AiSummaryInline householdId={hid} userId={user!.id} />

        {/* Overdue */}
        {(overdueChores.data?.length ?? 0) > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">
              Overdue ({overdueChores.data?.length})
            </p>
            <div className="space-y-2">
              {overdueChores.data?.map(c => (
                <Link key={c.id} href="/chores">
                  <Card className="flex items-center justify-between border-red-100">
                    <span className="text-sm font-medium text-brand-800">{c.title}</span>
                    <StatusBadge status="overdue" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Today chores */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Today</p>
          {(todayChores.data?.length ?? 0) === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-100 py-6">
              <EmptyState emoji="✅" title="All clear!" description="Nothing due today" />
            </div>
          ) : (
            <div className="space-y-2">
              {todayChores.data?.map(c => (
                <Link key={c.id} href="/chores">
                  <Card className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-800">{c.title}</span>
                    <StatusBadge status="today" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Today meals */}
        {(todayMeals.data?.length ?? 0) > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Meals today</p>
            <div className="flex gap-2 flex-wrap">
              {todayMeals.data?.map(m => (
                <Link key={m.id} href="/meals">
                  <span className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-200">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Reminders</p>
            <div className="space-y-2">
              {pendingReminders.data?.map(r => (
                <Link key={r.id} href="/reminders">
                  <Card>
                    <p className="text-sm font-medium text-brand-800">{r.title}</p>
                    <p className="text-xs text-brand-500 mt-0.5">{formatDate(r.due_at)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {(todayEvents.data?.length ?? 0) > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Upcoming (7 days)</p>
            <div className="space-y-2">
              {todayEvents.data?.map(e => (
                <Link key={e.id} href="/events">
                  <Card>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${catColors[e.category] ?? "bg-gray-300"}`} />
                      <p className="text-sm font-medium flex-1 text-brand-800">{e.title}</p>
                    </div>
                    <p className="text-xs text-brand-500 mt-0.5 ml-4">{formatDateTime(e.starts_at)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Groceries */}
        {(groceries.data?.length ?? 0) > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">Shopping</p>
            <Link href="/groceries">
              <Card>
                <div className="flex flex-wrap gap-1.5">
                  {groceries.data?.slice(0, 6).map(g => (
                    <span key={g.id} className={`text-xs px-2 py-0.5 rounded-full ${g.need_soon ? "bg-red-50 text-red-600 font-medium border border-red-100" : "bg-brand-50 text-brand-600 border border-brand-100"}`}>
                      {g.name}
                    </span>
                  ))}
                  {(groceries.data?.length ?? 0) > 6 && (
                    <span className="text-xs text-brand-400">+{(groceries.data?.length ?? 0) - 6} more</span>
                  )}
                </div>
              </Card>
            </Link>
          </section>
        )}

        {/* Completed today */}
        {(completedToday.data?.length ?? 0) > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">
              Done today ({completedToday.data?.length})
            </p>
            <div className="space-y-1">
              {completedToday.data?.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 px-1 py-1">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span className="text-sm text-brand-400 line-through">{c.chores?.title ?? "Chore"}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
