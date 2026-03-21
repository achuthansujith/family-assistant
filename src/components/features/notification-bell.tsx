"use client";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: "morning" | "evening";
  summary_text: string;
  ai_powered: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications/bell")
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications ?? []);
        setUnread(d.unread ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); setUnread(0); }}
        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 relative"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-800">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet</div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 capitalize">{n.type} summary</span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(n.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{n.summary_text}</p>
                  {n.ai_powered && (
                    <span className="text-[10px] text-brand-500 mt-1 inline-block">AI</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}