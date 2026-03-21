"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseIcs, ParsedEvent } from "@/lib/parsers/ics-parser";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { Upload } from "lucide-react";

export function IcsImport({ householdId, userId, onImported }: {
  householdId: string;
  userId: string;
  onImported: (events: any[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const events = parseIcs(content);
      setParsed(events);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!parsed?.length) return;
    setLoading(true);

    const rows = parsed.map(ev => ({
      household_id: householdId,
      created_by: userId,
      attendee_ids: [userId],
      title: ev.title,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      all_day: ev.all_day,
      location: ev.location,
      description: ev.description,
      category: ev.category,
    }));

    const batches: typeof rows[] = [];
    for (let i = 0; i < rows.length; i += 50) batches.push(rows.slice(i, i + 50));

    let inserted: any[] = [];
    for (const batch of batches) {
      const { data, error } = await supabase.from("events").insert(batch).select();
      if (error) {
        toast({ title: "Import error", description: error.message, variant: "error" });
        setLoading(false);
        return;
      }
      inserted = inserted.concat(data ?? []);
    }

    setLoading(false);
    setParsed(null);
    if (inputRef.current) inputRef.current.value = "";
    onImported(inserted);
    toast({ title: `Imported ${inserted.length} events`, variant: "success" });
  }

  function cancel() {
    setParsed(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      {!parsed ? (
        <>
          <input ref={inputRef} type="file" accept=".ics" className="hidden" onChange={handleFile} />
          <Button variant="secondary" size="sm" className="w-full" onClick={() => inputRef.current?.click()}>
            <Upload size={16} />
            Import from Google Calendar (.ics)
          </Button>
        </>
      ) : (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 space-y-3">
          <p className="text-sm font-medium text-blue-900">Found {parsed.length} events to import</p>
          <p className="text-xs text-blue-600">Categories auto-detected. You can edit events after import.</p>
          <div className="flex gap-2">
            <Button onClick={doImport} loading={loading} size="sm" className="flex-1">Import all</Button>
            <Button onClick={cancel} variant="secondary" size="sm" className="flex-1">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}