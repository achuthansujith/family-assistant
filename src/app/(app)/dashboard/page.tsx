import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { QuickAddBar } from "@/components/features/quick-add-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, isOverdue } from "@/lib/utils";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Calendar, ShoppingCart, Bell } from "lucide-react";

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
  const in7Days = format(addDays(today, 7), "yyyy-MM-dd");

  const [overdueChores, todayChores, todayEvents, pendingReminders, groceries] = await Promise.all([
    supabase.from("chores").select("id,title,due_date,priority,assignee_id")
      .eq("household_id", hid).eq("status", "pending").lt("due_date", todayStr).limit(5),
    supabase.from("chores").select("id,title,priority,assignee_id")
      .eq("household_id", hid).eq("status", "pending").eq("due_date", todayStr).limit(5),
    supabase.from("events").select("id,title,starts_at,category")
      .eq("household_id", hid)
      .gte("starts_at", startOfDay(today).toISOString())
      .lte("starts_at", endOfDay(addDays(today, 7)).toISOString())
      .order("starts_at").limit(5),
    supabase.from("reminders").select("id,title,due_at,assigned_to")
      .eq("household_id", hid).eq("status", "pending")
      .lte("due_at", endOfDay(today).toISOString()).limit(5),
    supabase.from("grocery_items").select("id,name,category")
      .eq("household_id", hid).eq("purchased", false).limit(8),
  ]);

  return (
    <div>
      <AppHeader title="HomeBase" />
      <div className="px-4 py-4 space-y-4">
        <QuickAddBar />

        {/* Overdue */}
        {(overdueChores.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <h2 className="text-sm font-semibold text-red-600">Overdue</h2>
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

        {/* Today */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Today</h2>
          </div>
          {(todayChores.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nothing due today</p>
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

        {/* Reminders */}
        {(pendingReminders.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} className="text-yellow-500" />
              <h2 className="text-sm font-semibold text-gray-700">Reminders</h2>
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

        {/* Upcoming Events */}
        {(todayEvents.data?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-purple-500" />
              <h2 className="text-sm font-semibold text-gray-700">Upcoming (7 days)</h2>
            </div>
            <div className="space-y-2">
              {todayEvents.data?.map(e => (
                <Link key={e.id} href="/events">
                  <Card className="py-3">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(e.starts_at)}</p>
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
              <h2 className="text-sm font-semibold text-gray-700">Shopping List</h2>
            </div>
            <Link href="/groceries">
              <Card className="py-3">
                <p className="text-sm text-gray-600">
                  {groceries.data?.slice(0, 4).map(g => g.name).join(", ")}
                  {(groceries.data?.length ?? 0) > 4 && ` +${(groceries.data?.length ?? 0) - 4} more`}
                </p>
              </Card>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}

