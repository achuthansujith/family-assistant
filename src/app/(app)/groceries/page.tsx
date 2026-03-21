import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { GroceriesList } from "./groceries-list";

export default async function GroceriesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const { data: items } = await supabase
    .from("grocery_items")
    .select("*, adder:profiles!grocery_items_added_by_fkey(id,display_name)")
    .eq("household_id", hid)
    .order("purchased", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div>
      <AppHeader title="Groceries" />
      <GroceriesList initialItems={items ?? []} householdId={hid} userId={user!.id} />
    </div>
  );
}
