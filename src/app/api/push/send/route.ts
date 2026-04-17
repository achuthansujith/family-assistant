import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, body, url, userId } = await req.json();
  const targetId = userId ?? user.id;
  const service = createServiceClient();
  const { data: subs } = await service
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetId);
  if (!subs?.length) return NextResponse.json({ sent: 0, message: "No subscriptions" });
  const payload = JSON.stringify({
    title: title ?? "Family Assistant AI",
    body: body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: url ?? "/dashboard",
  });
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      ).catch(async (err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await service.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
        throw err;
      })
    )
  );
  const sent = results.filter(r => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs.length });
}
