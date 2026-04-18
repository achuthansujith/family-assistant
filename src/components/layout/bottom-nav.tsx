"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, CheckSquare, ShoppingCart, Calendar, UtensilsCrossed } from "lucide-react";

const links = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/chores", icon: CheckSquare, label: "Chores" },
  { href: "/groceries", icon: ShoppingCart, label: "Grocery" },
  { href: "/events", icon: Calendar, label: "Events" },
  { href: "/meals", icon: UtensilsCrossed, label: "Meals" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-100 safe-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[44px] relative",
                active ? "text-brand-500" : "text-gray-400"
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
