"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, CheckSquare, Bell, ShoppingCart, Calendar, LayoutGrid } from "lucide-react";

const links = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/chores", icon: CheckSquare, label: "Chores" },
  { href: "/reminders", icon: Bell, label: "Reminders" },
  { href: "/groceries", icon: ShoppingCart, label: "Groceries" },
  { href: "/events", icon: Calendar, label: "Events" },
  { href: "/planner", icon: LayoutGrid, label: "Planner" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[48px]",
                active ? "text-brand-600" : "text-gray-400"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
