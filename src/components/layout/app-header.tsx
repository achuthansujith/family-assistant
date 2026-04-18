"use client";
import Link from "next/link";
import { Settings, Sparkles, ChevronLeft } from "lucide-react";
import { NotificationBell } from "@/components/features/notification-bell";

export function AppHeader({
  title,
  subtitle,
  userName,
  backHref,
}: {
  title: string;
  subtitle?: string;
  userName?: string;
  backHref?: string;
}) {
  const initials = userName
    ? userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : null;

  return (
    <header className="sticky top-0 z-30 bg-brand-500 safe-top">
      <div className="flex items-center justify-between px-4 py-3 gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {backHref && (
            <Link href={backHref} className="p-1 -ml-1 text-white/80 hover:text-white">
              <ChevronLeft size={22} />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-brand-200 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
          <Link href="/ai-summary" className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10">
            <Sparkles size={20} />
          </Link>
          <Link href="/settings" className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10">
            <Settings size={20} />
          </Link>
          {initials && (
            <div className="w-8 h-8 rounded-full bg-brand-300 flex items-center justify-center ml-1">
              <span className="text-xs font-bold text-brand-800">{initials}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
