"use client";
import { useEffect, useState } from "react";

export type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Get an active SW registration without relying on serviceWorker.ready
// (which hangs if the SW is stuck in installing/waiting state)
async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
  // First try existing registrations
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    if (reg.active) return reg;
  }

  // If none active yet, register /sw.js explicitly and wait up to 8s for activation
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  return new Promise((resolve, reject) => {
    // Already active
    if (reg.active) { resolve(reg); return; }

    const worker = reg.installing ?? reg.waiting;
    if (!worker) { reject(new Error("No service worker found")); return; }

    const timeout = setTimeout(() => reject(new Error("Service worker took too long to activate")), 8000);

    worker.addEventListener("statechange", function handler() {
      if (worker.state === "activated") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        resolve(reg);
      } else if (worker.state === "redundant") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        reject(new Error("Service worker became redundant"));
      }
    });
  });
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

    // Check for existing push subscription without waiting for SW.ready
    navigator.serviceWorker.getRegistrations()
      .then(regs => {
        const active = regs.find(r => r.active);
        if (!active) { setState("prompt"); return; }
        return active.pushManager.getSubscription().then(sub => {
          setState(sub ? "subscribed" : "prompt");
        });
      })
      .catch(() => setState("prompt"));
  }, []);

  async function subscribe(): Promise<boolean> {
    setError(null);
    setState("loading");
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("Push notifications not configured (missing VAPID key)");
        setState("prompt");
        return false;
      }

      // Get active registration (registers SW if needed, waits for activation)
      const reg = await getActiveRegistration();

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      // Save to server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

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
      if (Notification.permission === "denied" || msg.toLowerCase().includes("denied")) {
        setState("denied");
        setError("Permission denied — allow notifications in Settings > Safari > [this site]");
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
      const regs = await navigator.serviceWorker.getRegistrations();
      const active = regs.find(r => r.active);
      if (active) {
        const sub = await active.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
    } catch {}
    setState("prompt");
  }

  return { state, error, subscribe, unsubscribe };
}