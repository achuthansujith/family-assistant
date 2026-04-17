const { execSync } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../");

async function runQA({ config }) {
  const cmd = config.stack.build_command;
  let output = "";
  let passed = false;

  try {
    output = execSync(cmd, {
      cwd: PROJECT_ROOT,
      timeout: 180000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    passed = true;
  } catch (err) {
    output = (err.stdout || "") + "\n" + (err.stderr || "");
    passed = false;
  }

  const lines = output.split("\n");
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    if (/\berror\b|\bError\b|\bERROR\b|failed|Failed|✘|Unexpected/.test(lines[i]) && lines[i].trim()) {
      // Include up to 3 lines of context around each error
      const start = Math.max(0, i - 1);
      const end = Math.min(lines.length - 1, i + 3);
      for (let j = start; j <= end; j++) {
        if (lines[j].trim() && !errors.includes(lines[j])) errors.push(lines[j]);
      }
    }
  }

  return { passed, errors, output };
}

module.exports = { runQA };
