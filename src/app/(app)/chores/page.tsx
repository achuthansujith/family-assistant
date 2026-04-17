export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { ChoresList } from "./chores-list";

export default async function ChoresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const { data: chores } = await supabase
    .from("chores")
    .select("*, assignee:profiles!chores_assignee_id_fkey(id,display_name)")
    .eq("household_id", hid)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profile:profiles!household_members_user_id_fkey(id,display_name)")
    .eq("household_id", hid);

  return (
    <div>
      <AppHeader title="Chores" />
      <ChoresList
        initialChores={chores ?? []}
        householdId={hid}
        userId={user!.id}
        members={members ?? []}
      />
    </div>
  );
}

