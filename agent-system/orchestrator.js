#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { runPlanner } = require("./agents/planner");
const { runDeveloper } = require("./agents/developer");
const { runQA } = require("./agents/qa");
const { runFix } = require("./agents/fix");
const { runDeploy } = require("./agents/deploy");
const { runReport } = require("./agents/report");

const CONFIG_PATH = path.join(__dirname, "agent.config.json");
const LOGS_DIR = path.join(__dirname, "logs");

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function saveLog(timestamp, data) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = path.join(LOGS_DIR, `run-${timestamp}.json`);
  fs.writeFileSync(logFile, JSON.stringify(data, null, 2), "utf8");
  return logFile;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); })
  );
}

async function main() {
  const args = process.argv.slice(2);
  const task = args.join(" ").trim();

  if (!task) {
    console.error('Usage: node orchestrator.js "task description"');
    process.exit(1);
  }

  const config = loadConfig();
  const timestamp = Date.now();
  const startTime = Date.now();
  const runData = { task, timestamp, steps: [] };

  const step = (name, data) => {
    console.log(`\n${"─".repeat(60)}\n[${name.toUpperCase()}]`);
    runData.steps.push({ name, timestamp: Date.now(), data });
  };

  // ── PLANNER ──────────────────────────────────────────────────────────────
  step("planner", {});
  let plan;
  try {
    plan = await runPlanner({ task, config });
    console.log(`  Plan: ${plan.plan}`);
    console.log(`  Files: ${plan.filesToModify?.join(", ")}`);
    console.log(`  Risk: ${plan.estimatedRisk}`);
    runData.steps.at(-1).data = plan;
  } catch (err) {
    console.error("Planner failed:", err.message);
    saveLog(timestamp, runData);
    process.exit(1);
  }

  // ── DEVELOPER ────────────────────────────────────────────────────────────
  step("developer", {});
  let devResult;
  try {
    devResult = await runDeveloper({ plan: plan.plan, filesToModify: plan.filesToModify, config });
    console.log(`  Files changed: ${devResult.filesChanged.join(", ")}`);
    runData.steps.at(-1).data = devResult;
  } catch (err) {
    console.error("Developer failed:", err.message);
    saveLog(timestamp, runData);
    process.exit(1);
  }

  // ── QA + FIX LOOP ────────────────────────────────────────────────────────
  let qaResult;
  let fixAttempts = 0;
  let filesChanged = devResult.filesChanged;

  for (let i = 0; i <= config.max_fix_attempts; i++) {
    step(`qa (attempt ${i})`, {});
    qaResult = await runQA({ config });
    runData.steps.at(-1).data = { passed: qaResult.passed, errorCount: qaResult.errors.length };
    console.log(`  Build ${qaResult.passed ? "✓ PASSED" : "✗ FAILED"} (${qaResult.errors.length} errors)`);

    if (qaResult.passed) break;

    if (i >= config.max_fix_attempts) {
      console.error(`\nMax fix attempts (${config.max_fix_attempts}) exceeded. Aborting.`);
      const logFile = saveLog(timestamp, runData);
      const duration = Math.round((Date.now() - startTime) / 1000);
      await runReport({ task, plan, qaResult, deployResult: null, fixAttempts, duration, logFile });
      process.exit(1);
    }

    fixAttempts++;
    step(`fix (attempt ${fixAttempts})`, {});
    try {
      const fixResult = await runFix({ errors: qaResult.errors, filesChanged, attempt: fixAttempts, config });
      runData.steps.at(-1).data = fixResult;
      filesChanged = [...new Set([...filesChanged, ...fixResult.filesChanged])];
    } catch (err) {
      console.error("Fix failed:", err.message);
      break;
    }
  }

  if (!qaResult.passed) {
    const logFile = saveLog(timestamp, runData);
    const duration = Math.round((Date.now() - startTime) / 1000);
    await runReport({ task, plan, qaResult, deployResult: null, fixAttempts, duration, logFile });
    process.exit(1);
  }

  // ── DEPLOY ───────────────────────────────────────────────────────────────
  step("deploy", {});
  let deployResult = { skipped: true };
  let approved = false;

  if (approveFlag) {
    approved = true;
    console.log("  Deploy approved via --approve flag.");
  } else if (config.require_approval_before_deploy) {
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT APPROVAL REQUIRED");
    console.log("=".repeat(60));
    console.log(`Plan: ${plan.plan}`);
    console.log(`Files: ${filesChanged.join(", ")}`);
    const ans = await ask("\nDeploy to GitHub? (yes/no): ");
    approved = ans.toLowerCase() === "yes" || ans.toLowerCase() === "y";
  } else if (config.enable_auto_deploy) {
    approved = true;
  }

  try {
    deployResult = await runDeploy({ filesChanged, approved, task, config });
    runData.steps.at(-1).data = deployResult;
    if (!deployResult.skipped) {
      console.log(`  Branch: ${deployResult.branch}`);
      console.log(`  Commit: ${deployResult.commitHash}`);
    }
  } catch (err) {
    console.error("Deploy failed:", err.message);
    deployResult = { skipped: true, error: err.message };
  }

  // ── REPORT ───────────────────────────────────────────────────────────────
  const duration = Math.round((Date.now() - startTime) / 1000);
  const logFile = saveLog(timestamp, runData);
  await runReport({ task, plan, qaResult, deployResult, fixAttempts, duration, logFile });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
