"use client";
import { useEffect, useState } from "react";

export type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "loading";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Register /sw.js and return the registration.
// Our SW uses skipWaiting+clients.claim so it activates immediately.
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // Re-use existing registration if already active
  const existing = await navigator.serviceWorker.getRegistrations();
  const active = existing.find(r => r.active);
  if (active) return active;

  // Register fresh
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  // If already active (fast path)
  if (reg.active) return reg;

  // Wait for the installing/waiting worker to activate (should be near-instant)
  return new Promise((resolve, reject) => {
    const worker = reg.installing ?? reg.waiting;
    if (!worker) { reject(new Error("No worker found after registration")); return; }

    const timeout = setTimeout(() => reject(new Error("Service worker activation timed out")), 5000);

    worker.addEventListener("statechange", function handler() {
      if (worker.state === "activated") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        resolve(reg);
      } else if (worker.state === "redundant") {
        clearTimeout(timeout);
        worker.removeEventListener("statechange", handler);
        reject(new Error("Service worker failed to install — check /sw.js is accessible"));
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
      setState("unsupported"); return;
    }
    if (Notification.permission === "denied") {
      setState("denied"); return;
    }

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
        setError("Push not configured — VAPID key missing");
        setState("prompt");
        return false;
      }

      const reg = await getRegistration();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (res.ok) { setState("subscribed"); return true; }

      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? `Server error ${res.status}`);
      setState("prompt");
      return false;
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (Notification.permission === "denied" || msg.toLowerCase().includes("denied")) {
        setState("denied");
        setError("Permission denied — go to Settings > Safari > this site and allow notifications");
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