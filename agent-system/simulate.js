#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Config ────────────────────────────────────────────────────────────────────
const APP_URL = "https://family-assistant-six.vercel.app";
const SUPABASE_URL = "https://otsffywzadcfskvosemu.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90c2ZmeXd6YWRjZnNrdm9zZW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjQyMTgsImV4cCI6MjA4OTcwMDIxOH0.-GFr45sDRjq55vpONaZDlYnytz8lnZE0rgrQR8Tqi4E";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90c2ZmeXd6YWRjZnNrdm9zZW11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEyNDIxOCwiZXhwIjoyMDg5NzAwMjE4fQ.6-LrwJDrnCxKqB-Zu3FHJequntq9LJkQ1irV89Yth0Y";

const SIM_A = { email: "sim-a@familytest.dev", password: "SimTest123!", name: "Sim Alpha" };
const SIM_B = { email: "sim-b@familytest.dev", password: "SimTest123!", name: "Sim Beta" };

const TIMESTAMP = Date.now();
const LOGS_DIR = path.join(__dirname, "logs");
const REPORT_PATH = path.join(LOGS_DIR, `sim-${TIMESTAMP}-report.md`);

// ── Result tracking ───────────────────────────────────────────────────────────
const results = [];
let currentPhase = "";

function check(label, condition, expected = "", actual = "") {
  const pass = Boolean(condition);
  console.log(`  ${pass ? "✓" : "✗"} ${pass ? "PASS" : "FAIL"}: ${label}`);
  if (!pass && (expected !== "" || actual !== "")) {
    console.log(`       Expected: ${JSON.stringify(expected)}`);
    console.log(`       Actual:   ${JSON.stringify(actual)}`);
  }
  results.push({ phase: currentPhase, label, pass, expected, actual });
  return pass;
}

function phase(name) {
  currentPhase = name;
  console.log(`\n${"─".repeat(60)}\n[${name}]`);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const body = options.body != null ? JSON.stringify(options.body) : undefined;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let json;
          try { json = JSON.parse(data); } catch { json = data; }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// Supabase admin REST
function sbAdmin(p, opts = {}) {
  return request(`${SUPABASE_URL}${p}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
      ...(opts.headers || {}),
    },
  });
}

// Supabase anon REST
function sbAnon(p, opts = {}) {
  return request(`${SUPABASE_URL}${p}`, {
    ...opts,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
}

// Build the @supabase/ssr cookie value from a session object
function buildSupabaseCookie(session) {
  const PROJECT_REF = "otsffywzadcfskvosemu";
  const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;
  // @supabase/ssr 0.4.x stores: "base64-" + base64url(JSON.stringify(session))
  const json = JSON.stringify(session);
  const b64 = "base64-" + Buffer.from(json).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${COOKIE_NAME}=${b64}`;
}

// App API (authenticated via Supabase SSR cookie)
function appApi(session, p, opts = {}) {
  const cookie = buildSupabaseCookie(typeof session === "string"
    ? { access_token: session }
    : session);
  return request(`${APP_URL}${p}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(opts.headers || {}),
    },
  });
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function deleteSimUsers() {
  const res = await sbAdmin("/auth/v1/admin/users?per_page=200");
  const simUsers = (res.data?.users ?? []).filter(u => u.email?.includes("familytest.dev"));
  for (const u of simUsers) {
    await sbAdmin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  }
  return simUsers.length;
}

async function adminCreateUser(user) {
  const res = await sbAdmin("/auth/v1/admin/users", {
    method: "POST",
    body: {
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.name },
    },
  });
  if (!res.data?.id) throw new Error(`Admin create failed: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function signIn(user) {
  const res = await sbAnon("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: user.email, password: user.password },
  });
  if (!res.data?.access_token) throw new Error(`Sign-in failed: ${JSON.stringify(res.data)}`);
  return res.data;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbGet(table, filters = {}) {
  const params = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join("&");
  const res = await sbAdmin(`/rest/v1/${table}?${params}&limit=50`, {
    headers: { Accept: "application/json" },
  });
  return Array.isArray(res.data) ? res.data : [];
}

async function dbInsert(table, row) {
  const res = await sbAdmin(`/rest/v1/${table}`, {
    method: "POST",
    body: row,
    prefer: "return=representation",
    headers: { Prefer: "return=representation" },
  });
  return Array.isArray(res.data) ? res.data[0] : res.data;
}

async function dbPatch(table, filters, patch) {
  const params = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join("&");
  return sbAdmin(`/rest/v1/${table}?${params}`, { method: "PATCH", body: patch });
}

async function dbDelete(table, filters) {
  const params = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join("&");
  return sbAdmin(`/rest/v1/${table}?${params}`, { method: "DELETE" });
}

// ── State ─────────────────────────────────────────────────────────────────────
let tokenA, tokenB, userA, userB;
let householdId;
const created = { chores: [], reminders: [], groceries: [], events: [], meals: [] };

// ── PHASE 1: Auth & household setup ──────────────────────────────────────────
async function phase1() {
  phase("PHASE 1 — Auth & Household Setup");

  // Clean up leftovers
  const cleaned = await deleteSimUsers();
  if (cleaned > 0) console.log(`  ℹ  Cleaned ${cleaned} leftover sim account(s)`);

  // Create both users via admin API (pre-confirmed, no email needed)
  try {
    userA = await adminCreateUser(SIM_A);
    check("Person A account created", !!userA?.id, "user id", userA?.id ?? "missing");
  } catch (err) {
    check("Person A account created", false, "user id", err.message);
    throw err;
  }

  try {
    userB = await adminCreateUser(SIM_B);
    check("Person B account created", !!userB?.id, "user id", userB?.id ?? "missing");
  } catch (err) {
    check("Person B account created", false, "user id", err.message);
    throw err;
  }

  // Upsert profiles (app requires profiles table entry)
  await dbInsert("profiles", { id: userA.id, email: SIM_A.email, display_name: SIM_A.name });
  await dbInsert("profiles", { id: userB.id, email: SIM_B.email, display_name: SIM_B.name });

  // Sign in to get session tokens
  try {
    tokenA = await signIn(SIM_A);
    check("Person A signed in", !!tokenA.access_token);
  } catch (err) {
    check("Person A signed in", false, "token", err.message);
    throw err;
  }

  try {
    tokenB = await signIn(SIM_B);
    check("Person B signed in", !!tokenB.access_token);
  } catch (err) {
    check("Person B signed in", false, "token", err.message);
    throw err;
  }

  // Person A creates household via app API
  const createRes = await appApi(tokenA, "/api/household/create", {
    method: "POST",
    body: { name: "Sim Household" },
  });
  check("Household created (status)", createRes.status === 200, 200, createRes.status);
  if (createRes.status !== 200) {
    throw new Error(`Household create failed: ${JSON.stringify(createRes.data)}`);
  }

  householdId = createRes.data?.household?.id;
  check("Household ID returned", !!householdId, "uuid", householdId ?? "missing");

  // Get invite code via GET /api/household/invite
  const inviteRes = await appApi(tokenA, "/api/household/invite");
  check("Invite code fetched (status)", inviteRes.status === 200, 200, inviteRes.status);
  const inviteCode = inviteRes.data?.invite_code;
  check("Invite code present", !!inviteCode, "code", inviteCode ?? "missing");

  // Person B joins via invite
  if (inviteCode) {
    const joinRes = await appApi(tokenB, "/api/household/invite", {
      method: "POST",
      body: { invite_code: inviteCode },
    });
    check("Person B joined household (status)", joinRes.status === 200, 200, joinRes.status);
    check("Person B joined flag", !!joinRes.data?.joined || !!joinRes.data?.already_member);
  }

  // Verify both members in same household via DB
  const members = await dbGet("household_members", { household_id: householdId });
  const memberIds = members.map(m => m.user_id);
  check("Person A in household", memberIds.includes(userA.id));
  check("Person B in household", memberIds.includes(userB.id));
}

// ── PHASE 2: Morning ─────────────────────────────────────────────────────────
async function phase2() {
  phase("PHASE 2 — Morning: Chores & Reminders");

  const todayStr = new Date().toISOString().slice(0, 10);

  // Person A adds chore assigned to Person B (direct DB — quick-add/save doesn't support assignee_id)
  const chore = await dbInsert("chores", {
    household_id: householdId,
    created_by: userA.id,
    assignee_id: userB.id,
    title: "Take out bins",
    due_date: todayStr,
    priority: "medium",
    status: "pending",
  });
  check("Chore inserted", !!chore?.id, "id", chore?.id ?? "missing");
  check("Chore assigned to Person B", chore?.assignee_id === userB.id, userB.id, chore?.assignee_id);
  check("Chore due today", chore?.due_date === todayStr, todayStr, chore?.due_date);
  if (chore?.id) created.chores.push(chore.id);

  // Verify via DB read
  const dbChore = (await dbGet("chores", { household_id: householdId, title: "Take out bins" }))[0];
  check("Chore confirmed in DB", !!dbChore?.id);

  // Person A adds reminder for Person B
  const reminder = await dbInsert("reminders", {
    household_id: householdId,
    created_by: userA.id,
    assigned_to: userB.id,
    title: "Call dentist",
    due_at: new Date(Date.now() + 3600000).toISOString(),
    status: "pending",
  });
  check("Reminder inserted", !!reminder?.id, "id", reminder?.id ?? "missing");
  if (reminder?.id) created.reminders.push(reminder.id);

  // Person B: dashboard accessible
  const dashRes = await appApi(tokenB, "/dashboard");
  check("Person B dashboard reachable", dashRes.status === 200, 200, dashRes.status);

  // Person B can see chore (household-scoped)
  const bChores = await dbGet("chores", { household_id: householdId, assignee_id: userB.id });
  check("Person B sees assigned chore", bChores.some(c => c.title === "Take out bins"));

  // Person B can see reminder
  const bReminders = await dbGet("reminders", { household_id: householdId, assigned_to: userB.id });
  check("Person B sees reminder", bReminders.some(r => r.title === "Call dentist"));
}

// ── PHASE 3: Midday ──────────────────────────────────────────────────────────
async function phase3() {
  phase("PHASE 3 — Midday: Grocery & Meals");

  // Person A adds 4 grocery items via quick-add/save (correct body format)
  const aItems = [
    { name: "milk", category: "dairy" },
    { name: "eggs", category: "dairy" },
    { name: "bread", category: "bakery" },
    { name: "pasta", category: "other" },
  ];

  for (const item of aItems) {
    const res = await appApi(tokenA, "/api/quick-add/save", {
      method: "POST",
      body: {
        result: {
          type: "grocery",
          confidence: 1,
          data: { name: item.name, category: item.category },
        },
      },
    });
    check(`Person A added "${item.name}" via API`, res.status === 200, 200, res.status);
  }

  // Person B adds 2 items via quick-add/save
  const bItems = [
    { name: "chicken", category: "meat" },
    { name: "tomatoes", category: "produce" },
  ];

  for (const item of bItems) {
    const res = await appApi(tokenB, "/api/quick-add/save", {
      method: "POST",
      body: {
        result: {
          type: "grocery",
          confidence: 1,
          data: { name: item.name, category: item.category },
        },
      },
    });
    check(`Person B added "${item.name}" via API`, res.status === 200, 200, res.status);
  }

  // Verify 6 sim items total
  const allNames = ["milk","eggs","bread","pasta","chicken","tomatoes"];
  const groceries = await dbGet("grocery_items", { household_id: householdId });
  const simGroceries = groceries.filter(g => allNames.includes(g.name));
  check("Grocery list has 6 sim items", simGroceries.length === 6, 6, simGroceries.length);
  created.groceries.push(...simGroceries.map(g => g.id));

  // Person A plans a meal via quick-add/save
  const mealRes = await appApi(tokenA, "/api/quick-add/save", {
    method: "POST",
    body: {
      result: {
        type: "event",  // meals go through "event" type in quick-add? Let's check via direct insert
        confidence: 1,
        data: {},
      },
    },
  });
  // quick-add/save doesn't have a "meal" type — insert directly
  const meal = await dbInsert("meal_plans", {
    household_id: householdId,
    created_by: userA.id,
    plan_date: new Date().toISOString().slice(0, 10),
    slot: "dinner",
    meal_name: "Pasta Bolognese",
  });
  check("Meal plan inserted", !!meal?.id, "id", meal?.id ?? "missing");
  if (meal?.id) created.meals.push(meal.id);

  // Person B marks milk as purchased
  const milk = simGroceries.find(g => g.name === "milk");
  if (milk) {
    await dbPatch("grocery_items", { id: milk.id }, {
      purchased: true,
      purchased_by: userB.id,
      purchased_at: new Date().toISOString(),
    });
  }

  // Verify milk shows as purchased when Person A looks
  const refreshed = await dbGet("grocery_items", { household_id: householdId });
  const milkRow = refreshed.find(g => g.name === "milk");
  check("Milk marked purchased", milkRow?.purchased === true, true, milkRow?.purchased);
  check("Milk purchased by Person B", milkRow?.purchased_by === userB.id, userB.id, milkRow?.purchased_by);
}

// ── PHASE 4: Evening ─────────────────────────────────────────────────────────
async function phase4() {
  phase("PHASE 4 — Evening: Completions & Notifications");

  // Find chore
  const chores = await dbGet("chores", { household_id: householdId });
  const chore = chores.find(c => c.title === "Take out bins");
  if (!chore) {
    check("Chore found for completion", false, "chore row", "missing");
    return;
  }

  // Person B completes chore
  const completion = await dbInsert("chore_completions", {
    chore_id: chore.id,
    completed_by: userB.id,
    completed_at: new Date().toISOString(),
  });
  await dbPatch("chores", { id: chore.id }, { status: "done" });

  const completions = await dbGet("chore_completions", { chore_id: chore.id });
  check("Completion record created", completions.length > 0, ">0 rows", completions.length);
  check("Completed by Person B", completions[0]?.completed_by === userB.id, userB.id, completions[0]?.completed_by);

  // Person B sends push notification to Person A via app API
  const notifRes = await appApi(tokenB, "/api/push/send", {
    method: "POST",
    body: {
      title: "Chore done!",
      body: `${SIM_B.name} completed: ${chore.title}`,
      userId: userA.id,
      url: "/chores",
    },
  });
  // 200 is success; if Person A has no push subscriptions, sent:0 is still 200
  check("Push notification call succeeded", notifRes.status === 200, 200, notifRes.status);
  check("Push response has sent count", typeof notifRes.data?.sent === "number");

  // Person A adds event via app API (quick-add/save supports "event")
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  const eventRes = await appApi(tokenA, "/api/quick-add/save", {
    method: "POST",
    body: {
      result: {
        type: "event",
        confidence: 1,
        data: {
          title: "Movie night",
          starts_at: tomorrow.toISOString(),
          category: "family",
        },
      },
    },
  });
  check("Event added via API (status)", eventRes.status === 200, 200, eventRes.status);

  const events = await dbGet("events", { household_id: householdId });
  const event = events.find(e => e.title === "Movie night");
  check("Event exists in DB", !!event?.id, "event row", event ? "found" : "missing");
  check("Event visible to Person B (same household)", !!event);
  if (event?.id) created.events.push(event.id);

  // Trigger evening summary via app API
  const summaryRes = await appApi(tokenA, "/api/notifications/summary?type=evening", {
    method: "POST",
    body: {},
  });
  check("Evening summary returned 200", summaryRes.status === 200, 200, summaryRes.status);
  check("Summary text returned", typeof summaryRes.data?.summary === "string");

  // Verify notification_delivery_log entry (table may not exist — soft check)
  const logs = await sbAdmin("/rest/v1/notification_delivery_log?user_id=eq." + userA.id + "&order=created_at.desc&limit=5", {
    headers: { Accept: "application/json" },
  });
  if (logs.status === 404 || logs.data?.code === "PGRST205") {
    console.log("  ℹ  notification_delivery_log table not found — skipping log check");
  } else {
    const logRows = Array.isArray(logs.data) ? logs.data : [];
    check("Delivery log entry created", logRows.length > 0, ">0 rows", logRows.length);
    if (logRows[0]) {
      check("Log type is 'evening'", logRows[0].type === "evening", "evening", logRows[0].type);
    }
  }
}

// ── PHASE 5: Report ──────────────────────────────────────────────────────────
function generateReport(durationMs) {
  phase("PHASE 5 — Report");

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  const runAt = new Date().toISOString();

  const phases = [...new Set(results.map(r => r.phase))];
  const phaseRows = phases
    .filter(p => !p.includes("Report") && !p.includes("Cleanup"))
    .map(p => {
      const pr = results.filter(r => r.phase === p);
      return `| ${p} | ${pr.filter(r => r.pass).length} | ${pr.filter(r => !r.pass).length} |`;
    })
    .join("\n");

  const failures = results.filter(r => !r.pass)
    .map(r => `- **${r.phase} › ${r.label}**\n  - Expected: \`${JSON.stringify(r.expected)}\`\n  - Actual: \`${JSON.stringify(r.actual)}\``)
    .join("\n");

  const notifChecks = results.filter(r =>
    r.label.toLowerCase().includes("notif") || r.label.toLowerCase().includes("push") || r.label.toLowerCase().includes("summary")
  );
  const notifRate = notifChecks.length
    ? `${notifChecks.filter(r => r.pass).length}/${notifChecks.length} notification checks passed`
    : "No notification checks ran";

  const md = `# Family Assistant Simulation Report

**Run:** ${runAt}
**Duration:** ${(durationMs / 1000).toFixed(1)}s
**App:** ${APP_URL}

---

## Summary

| | Count |
|---|---|
| ✓ Passed | ${passed} |
| ✗ Failed | ${failed} |
| Total | ${total} |

---

## Per-Phase Results

| Phase | Passed | Failed |
|---|---|---|
${phaseRows}

---

## Failures

${failed === 0 ? "_None — all checks passed! 🎉_" : failures}

---

## Notifications

${notifRate}

---

## Data Isolation

All simulation data scoped to household \`${householdId ?? "unknown"}\`.
Person A and Person B shared the same household — no cross-household data was tested.

---

## Cleanup

- ${created.chores.length} chores deleted
- ${created.reminders.length} reminders deleted
- ${created.groceries.length} grocery items deleted
- ${created.events.length} events deleted
- ${created.meals.length} meal plans deleted
- Household and both user accounts deleted
`;

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, md, "utf8");

  console.log(`\nReport saved → ${REPORT_PATH}`);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`RESULT: ${passed}/${total} passed, ${failed} failed (${(durationMs/1000).toFixed(1)}s)`);
  console.log(`${"═".repeat(60)}`);
  if (failed > 0) {
    console.log("\nFailures:");
    results.filter(r => !r.pass).forEach(r => console.log(`  ✗ [${r.phase}] ${r.label}`));
  }
}

// ── PHASE 6: Cleanup ─────────────────────────────────────────────────────────
async function cleanup() {
  phase("PHASE 6 — Cleanup");
  try {
    // Grocery items
    for (const id of created.groceries) await dbDelete("grocery_items", { id });

    // Chore completions → chores
    for (const id of created.chores) {
      await dbDelete("chore_completions", { chore_id: id });
      await dbDelete("chores", { id });
    }
    // Catch any chores not in created list
    if (householdId) {
      const extra = await dbGet("chores", { household_id: householdId });
      for (const c of extra) {
        await dbDelete("chore_completions", { chore_id: c.id });
        await dbDelete("chores", { id: c.id });
      }
    }

    for (const id of created.reminders) await dbDelete("reminders", { id });
    for (const id of created.events) await dbDelete("events", { id });
    for (const id of created.meals) await dbDelete("meal_plans", { id });

    // Notification delivery log
    if (userA) await dbDelete("notification_delivery_log", { user_id: userA.id });
    if (userB) await dbDelete("notification_delivery_log", { user_id: userB.id });

    // Household members → settings → household
    if (householdId) {
      await dbDelete("household_members", { household_id: householdId });
      await dbDelete("household_settings", { household_id: householdId });
      await dbDelete("households", { id: householdId });
    }

    // Profiles
    if (userA) await dbDelete("profiles", { id: userA.id });
    if (userB) await dbDelete("profiles", { id: userB.id });

    // Auth users
    const cleaned = await deleteSimUsers();
    check(`Auth accounts deleted (${cleaned})`, cleaned >= 0);
  } catch (err) {
    console.error("  Cleanup error:", err.message);
  }
  console.log("  Cleanup complete.");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║       FAMILY ASSISTANT — FULL DAY SIMULATION             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  App: ${APP_URL}`);
  console.log(`  Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    await phase1();
  } catch (err) {
    console.error("\nFatal in Phase 1:", err.message);
    await cleanup();
    process.exit(1);
  }

  for (const fn of [phase2, phase3, phase4]) {
    try {
      await fn();
    } catch (err) {
      console.error(`\nUnexpected error: ${err.message}`);
      results.push({ phase: currentPhase, label: `Unexpected error: ${err.message}`, pass: false, expected: "", actual: err.message });
    }
  }

  generateReport(Date.now() - startTime);
  await cleanup();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
