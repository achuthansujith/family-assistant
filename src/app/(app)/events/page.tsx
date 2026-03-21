import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { EventsList } from "./events-list";

export default async function EventsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members").select("household_id").eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("household_id", hid)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, profile:profiles!household_members_user_id_fkey(id,display_name)")
    .eq("household_id", hid);

  return (
    <div>
      <AppHeader title="Events" />
      <EventsList initialEvents={events ?? []} householdId={hid} userId={user!.id} members={members ?? []} />
    </div>
  );
}
