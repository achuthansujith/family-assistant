import { cn } from "@/lib/utils";

export function Card({ children, className, onClick }: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-4",
        onClick && "cursor-pointer active:scale-[0.98] transition-transform",
        className
      )}
    >
      {children}
    </div>
  );
}
