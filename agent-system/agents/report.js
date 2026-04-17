const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.resolve(__dirname, "../logs");

async function runReport({ task, plan, qaResult, deployResult, fixAttempts, duration, logFile }) {
  const status = deployResult?.skipped === false && deployResult?.branch
    ? "DEPLOYED"
    : qaResult?.passed
    ? "BUILD PASSED — deploy skipped"
    : "BUILD FAILED";

  const lines = [
    "# Agent Run Report",
    "",
    `**Task:** ${task}`,
    `**Status:** ${status}`,
    `**Duration:** ${duration}s`,
    "",
    "## Plan",
    plan?.plan || "(none)",
    "",
    `**Risk:** ${plan?.estimatedRisk || "unknown"}`,
    "",
    "## Acceptance Criteria",
    ...(plan?.acceptanceCriteria || []).map((c) => `- ${c}`),
    "",
    "## Files Changed",
    ...(plan?.filesToModify || []).map((f) => `- \`${f}\``),
    "",
    "## QA Result",
    `**Build passed:** ${qaResult?.passed ? "✓ Yes" : "✗ No"}`,
    `**Fix attempts:** ${fixAttempts}`,
  ];

  if (!qaResult?.passed && qaResult?.errors?.length) {
    lines.push("", "### Errors");
    qaResult.errors.slice(0, 15).forEach((e) => lines.push(`- ${e}`));
  }

  if (deployResult && !deployResult.skipped) {
    lines.push(
      "",
      "## Deployment",
      `**Branch:** \`${deployResult.branch}\``,
      `**Commit:** \`${deployResult.commitHash}\``,
      `**URL:** ${deployResult.deployUrl}`
    );
  }

  if (logFile) lines.push("", `**Log:** \`${logFile}\``);

  const md = lines.join("\n");
  console.log("\n" + md + "\n");

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const ts = Date.now();
  const reportPath = path.join(LOGS_DIR, `run-${ts}-report.md`);
  fs.writeFileSync(reportPath, md, "utf8");
  console.log(`Report saved: ${reportPath}`);
}

module.exports = { runReport };
