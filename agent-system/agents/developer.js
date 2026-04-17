const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isProtected(filePath, protectedFiles) {
  return protectedFiles.some((p) => filePath.replace(/\\/g, "/").includes(p));
}

async function runDeveloper({ plan, filesToModify, config }) {
  const client = new Anthropic.default();
  const filesChanged = [];

  for (const relPath of filesToModify) {
    if (isProtected(relPath, config.protected_files)) {
      console.log(`  [developer] SKIP protected: ${relPath}`);
      continue;
    }

    const absPath = path.resolve(PROJECT_ROOT, relPath);
    let current = "";
    let fileExists = false;
    try {
      current = fs.readFileSync(absPath, "utf8");
      fileExists = true;
    } catch {
      current = "(file does not exist — create it)";
    }

    // Never overwrite existing app source files — only create new files or modify test/mock files
    const isNewFile = !fileExists;
    const isTestOrMock = relPath.includes("__tests__") || relPath.includes(".test.") || relPath.includes(".spec.") || relPath.includes("/mocks/");
    if (fileExists && !isTestOrMock) {
      console.log(`  [developer] SKIP existing source file (won't overwrite): ${relPath}`);
      continue;
    }

    // Scale max_tokens to file size: at least 2000, ~12 tokens per line of existing content
    const lineCount = fileExists ? current.split("\n").length : 0;
    const maxTokens = Math.min(8000, Math.max(2000, lineCount * 12));

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{
        role: "user",
        content: `You are a senior Next.js developer implementing a code change.

Plan: ${plan}

File: ${relPath}

Current content:
\`\`\`
${current}
\`\`\`

CRITICAL: Return ONLY the complete file content. No markdown fences (no \`\`\`). No explanation. No preamble. The raw output is written directly to disk as-is.`
      }]
    });

    let newContent = response.content[0].text;
    // Strip markdown code fences if Claude added them despite instructions
    newContent = newContent.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```\s*$/, "");

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, newContent, "utf8");
    filesChanged.push(relPath);
    console.log(`  [developer] wrote: ${relPath}`);
    // Respect 8k tokens/min rate limit — pause between files
    await sleep(15000);
  }

  return { filesChanged };
}

module.exports = { runDeveloper };
