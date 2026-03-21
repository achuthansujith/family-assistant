// Minimal iCal (.ics) parser - handles Google Calendar exports
export interface ParsedEvent {
  title: string;
  starts_at: string;       // ISO string
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
  category: "appointment" | "school" | "family" | "travel" | "bill_payment" | "other";
}

function parseIcsDate(val: string): { iso: string; allDay: boolean } {
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(val)) {
    return { iso: `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00.000Z`, allDay: true };
  }
  // DateTime: YYYYMMDDTHHmmssZ or YYYYMMDDTHHmmss
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? 'Z' : ''}`;
    return { iso: new Date(iso).toISOString(), allDay: false };
  }
  return { iso: new Date(val).toISOString(), allDay: false };
}

function guessCategory(title: string, description: string | null): ParsedEvent["category"] {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (/school|class|lesson|homework|exam|teacher|grade/.test(text)) return "school";
  if (/doctor|dentist|appointment|clinic|hospital|therapy/.test(text)) return "appointment";
  if (/flight|hotel|trip|travel|vacation|holiday/.test(text)) return "travel";
  if (/bill|payment|invoice|rent|mortgage/.test(text)) return "bill_payment";
  if (/family|birthday|anniversary|party/.test(text)) return "family";
  return "other";
}

export function parseIcs(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  // Unfold lines (RFC 5545: lines ending with CRLF + whitespace are continuations)
  const unfolded = content.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let current: Record<string, string> = {};

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { inEvent = true; current = {}; continue; }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current["SUMMARY"] && (current["DTSTART"] || current["DTSTART;VALUE=DATE"])) {
        const dtstart = current["DTSTART"] || current["DTSTART;VALUE=DATE"] ||
          Object.keys(current).find(k => k.startsWith("DTSTART"))
            ? current[Object.keys(current).find(k => k.startsWith("DTSTART"))!] : null;
        const dtend = current["DTEND"] || current["DTEND;VALUE=DATE"] ||
          (Object.keys(current).find(k => k.startsWith("DTEND"))
            ? current[Object.keys(current).find(k => k.startsWith("DTEND"))!] : null);

        if (!dtstart) continue;

        const start = parseIcsDate(dtstart);
        const end = dtend ? parseIcsDate(dtend) : null;
        const title = current["SUMMARY"].replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
        const description = current["DESCRIPTION"]
          ? current["DESCRIPTION"].replace(/\\,/g, ",").replace(/\\n/g, "\n").trim()
          : null;
        const location = current["LOCATION"]
          ? current["LOCATION"].replace(/\\,/g, ",").trim()
          : null;

        events.push({
          title,
          starts_at: start.iso,
          ends_at: end ? end.iso : null,
          all_day: start.allDay,
          location: location || null,
          description: description || null,
          category: guessCategory(title, description),
        });
      }
      continue;
    }
    if (!inEvent) continue;

    // Parse key:value — key may have params like DTSTART;TZID=America/New_York
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).split(";")[0].toUpperCase();
    const value = line.slice(colonIdx + 1);
    current[key] = value;
    // Also store the full key with params for DTSTART/DTEND
    const fullKey = line.slice(0, colonIdx).toUpperCase();
    if (fullKey !== key) current[fullKey] = value;
  }

  return events;
}
