"use client";
import { useEffect, useState } from "react";

export type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Wraps a promise with a timeout — rejects after ms milliseconds
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms)
    ),
  ]);
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    const timeout = setTimeout(() => setState("prompt"), 4000);

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        clearTimeout(timeout);
        setState(sub ? "subscribed" : "prompt");
      })
      .catch(() => {
        clearTimeout(timeout);
        setState("prompt");
      });

    return () => clearTimeout(timeout);
  }, []);

  async function subscribe(): Promise<boolean> {
    setError(null);
    setState("loading");
    try {
      // Step 1: get SW registration (4s timeout)
      const reg = await withTimeout(
        navigator.serviceWorker.ready,
        4000,
        "serviceWorker.ready"
      );

      // Step 2: subscribe to push (10s timeout — iOS permission prompt can be slow)
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("VAPID key not configured");
        setState("prompt");
        return false;
      }

      const sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
        }),
        10000,
        "pushManager.subscribe"
      );

      // Step 3: save to server (5s timeout)
      const res = await withTimeout(
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        }),
        5000,
        "save subscription"
      );

      if (res.ok) {
        setState("subscribed");
        return true;
      }

      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? `Server error ${res.status}`);
      setState("prompt");
      return false;
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      // User explicitly denied
      if (msg.includes("denied") || Notification.permission === "denied") {
        setState("denied");
        setError("Permission denied — allow notifications in your phone settings");
      } else {
        setState("prompt");
        setError(msg);
      }
      return false;
    }
  }

  async function unsubscribe(): Promise<void> {
    setError(null);
    try {
      const reg = await withTimeout(navigator.serviceWorker.ready, 4000, "serviceWorker.ready");
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

  return { state, error, subscribe, unsubscribe };
}