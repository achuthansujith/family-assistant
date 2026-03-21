"use client";
import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";
import { NotificationBell } from "@/components/features/notification-bell";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/ai-summary" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <Sparkles size={20} />
          </Link>
          <Link href="/settings" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <Settings size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}