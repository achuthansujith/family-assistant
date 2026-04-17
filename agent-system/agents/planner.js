const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../");

function readTree(dir, base, depth = 0) {
  if (depth > 3) return [];
  const skip = new Set(["node_modules", ".next", ".git", "dist", ".turbo", "__pycache__"]);
  let results = [];
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return results; }
  for (const e of entries) {
    if (skip.has(e)) continue;
    const full = path.join(dir, e);
    const rel = path.relative(base, full);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(rel + "/");
      results.push(...readTree(full, base, depth + 1));
    } else {
      results.push(rel);
    }
  }
  return results;
}

async function runPlanner({ task, config }) {
  const srcDir = path.join(PROJECT_ROOT, "src");
  const fileTree = readTree(srcDir, PROJECT_ROOT).join("\n");

  const client = new Anthropic.default();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `You are a senior Next.js developer planning a code change.

Project file tree (under src/):
${fileTree}

Task: ${task}

IMPORTANT RULES for filesToModify:
- For tasks involving tests: only list NEW files to create (test files under src/__tests__/, mock files under src/__tests__/mocks/). Do NOT include existing source files.
- Only include an existing source file if the task explicitly requires modifying that specific file's implementation.
- When in doubt, omit the file — adding tests never requires modifying existing working source files.

Respond with ONLY valid JSON — no markdown fences, no extra text — in this exact shape:
{
  "plan": "concise description of what will be changed and why",
  "filesToModify": ["relative/path/from/project/root"],
  "acceptanceCriteria": ["criterion 1", "criterion 2"],
  "estimatedRisk": "low|medium|high"
}`
    }]
  });

  const raw = response.content[0].text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Planner did not return valid JSON: " + raw.slice(0, 200));
  return JSON.parse(match[0]);
}

module.exports = { runPlanner };
