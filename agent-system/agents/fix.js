const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isProtected(filePath, protectedFiles) {
  return protectedFiles.some((p) => filePath.replace(/\\/g, "/").includes(p));
}

async function runFix({ errors, filesChanged, attempt, config }) {
  const client = new Anthropic.default();
  const fixedFiles = [];
  const errorText = errors.join("\n");

  for (const relPath of filesChanged) {
    if (isProtected(relPath, config.protected_files)) {
      console.log(`  [fix] SKIP protected: ${relPath}`);
      continue;
    }

    const isTestOrMock = relPath.includes("__tests__") || relPath.includes(".test.") || relPath.includes(".spec.") || relPath.includes("/mocks/");
    if (!isTestOrMock) {
      console.log(`  [fix] SKIP existing source file: ${relPath}`);
      continue;
    }

    const absPath = path.resolve(PROJECT_ROOT, relPath);
    let current = "";
    try { current = fs.readFileSync(absPath, "utf8"); }
    catch { continue; }

    const lineCount = current.split("\n").length;
    const maxTokens = Math.max(2000, lineCount * 12);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{
        role: "user",
        content: `You are a senior Next.js developer fixing build errors. Fix attempt #${attempt}.

Build errors:
${errorText}

File: ${relPath}

Current content:
\`\`\`
${current}
\`\`\`

Return ONLY the complete corrected file content. No markdown fences. No explanation. The output is written directly to disk.`
      }]
    });

    let fixedContent = response.content[0].text;
    fixedContent = fixedContent.replace(/^```[^\n]*\n/, "").replace(/\n```\s*$/, "");
    fs.writeFileSync(absPath, fixedContent, "utf8");
    fixedFiles.push(relPath);
    console.log(`  [fix] fixed: ${relPath}`);
    await sleep(15000);
  }

  return { filesChanged: fixedFiles };
}

module.exports = { runFix };
