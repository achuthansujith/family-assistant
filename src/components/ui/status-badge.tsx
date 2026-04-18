import { cn } from "@/lib/utils";

type Status = "overdue" | "today" | "upcoming" | "done";

const styles: Record<Status, string> = {
  overdue:  "bg-red-50 text-red-600 border border-red-100",
  today:    "bg-brand-100 text-brand-700 border border-brand-200",
  upcoming: "bg-amber-50 text-amber-700 border border-amber-100",
  done:     "bg-green-50 text-green-600 border border-green-100",
};

const labels: Record<Status, string> = {
  overdue:  "Overdue",
  today:    "Today",
  upcoming: "Upcoming",
  done:     "Done",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", styles[status], className)}>
      {labels[status]}
    </span>
  );
}
