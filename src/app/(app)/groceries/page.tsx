import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { GroceriesList } from "./groceries-list";

export default async function GroceriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const [itemsRes, templatesRes] = await Promise.all([
    supabase.from("grocery_items").select("*").eq("household_id", hid)
      .order("need_soon", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    supabase.from("grocery_templates").select("*").eq("household_id", hid).order("name"),
  ]);

  return (
    <div>
      <AppHeader title="Groceries" />
      <GroceriesList
        initialItems={itemsRes.data ?? []}
        initialTemplates={templatesRes.data ?? []}
        householdId={hid}
        userId={user!.id}
      />
    </div>
  );
}