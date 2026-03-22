"use client";
import { useEffect, useState } from "react";

export type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported"); return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub =>
        setState(sub ? "subscribed" : "prompt")
      )
    ).catch(() => setState("unsupported"));
  }, []);

  async function subscribe(): Promise<boolean> {
    try {
      setState("loading");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as ArrayBuffer,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) { setState("subscribed"); return true; }
      setState("prompt"); return false;
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "prompt");
      return false;
    }
  }

  async function unsubscribe(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch {}
    setState("prompt");
  }

  return { state, subscribe, unsubscribe };
}