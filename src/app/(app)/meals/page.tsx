import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { MealPlanner } from "./meal-planner";
import { format, startOfWeek, addDays } from "date-fns";

export default async function MealsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const weekEnd = addDays(weekStart, 6);

  const [plansRes, mealsRes] = await Promise.all([
    supabase.from("meal_plans")
      .select("*")
      .eq("household_id", hid)
      .gte("plan_date", format(weekStart, "yyyy-MM-dd"))
      .lte("plan_date", format(weekEnd, "yyyy-MM-dd"))
      .order("plan_date").order("slot"),
    supabase.from("meals")
      .select("id,name,prep_minutes,tags")
      .eq("household_id", hid)
      .order("name"),
  ]);

  return (
    <div>
      <AppHeader title="Meal Planner" />
      <MealPlanner
        initialPlans={plansRes.data ?? []}
        meals={mealsRes.data ?? []}
        householdId={hid}
        userId={user!.id}
        weekStart={format(weekStart, "yyyy-MM-dd")}
      />
    </div>
  );
}