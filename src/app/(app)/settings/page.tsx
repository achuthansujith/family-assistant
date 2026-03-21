import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/app-header";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = await supabase
    .from("household_members")
    .select("household_id, role, profile:profiles!household_members_user_id_fkey(display_name,email)")
    .eq("user_id", user!.id).single();
  const hid = member!.household_id;

  const { data: household } = await supabase.from("households").select("*").eq("id", hid).single();
  const { data: settings } = await supabase.from("household_settings").select("*").eq("household_id", hid).single();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, profile:profiles!household_members_user_id_fkey(display_name,email)")
    .eq("household_id", hid);
  const { data: aiLogs } = await supabase
    .from("ai_usage_logs")
    .select("id,feature,total_tokens,success,created_at")
    .eq("household_id", hid)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <AppHeader title="Settings" />
      <SettingsForm
        household={household}
        settings={settings}
        members={members ?? []}
        aiLogs={aiLogs ?? []}
        userId={user!.id}
        isOwner={member!.role === "owner"}
      />
    </div>
  );
}
