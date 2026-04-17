export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { RemindersList } from "./reminders-list";

export default async function RemindersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, assignee:profiles!reminders_assigned_to_fkey(id,display_name)")
    .eq("household_id", hid)
    .order("due_at", { ascending: true });

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profile:profiles!household_members_user_id_fkey(id,display_name)")
    .eq("household_id", hid);

  return (
    <div>
      <AppHeader title="Reminders" />
      <RemindersList initialReminders={reminders ?? []} householdId={hid} userId={user!.id} members={members ?? []} />
    </div>
  );
}

