const { execSync } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../");

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function runDeploy({ filesChanged, approved, task, config }) {
  if (!approved) {
    console.log("Deployment skipped — approval required");
    return { skipped: true };
  }

  const branch = `${config.branch_prefix}${Date.now()}-${slugify(task)}`;

  const run = (cmd) =>
    execSync(cmd, { cwd: PROJECT_ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });

  run(`git checkout -b ${branch}`);
  run("git add .");
  run(`git commit -m "agent: ${task.slice(0, 72)}"`);
  run(`git push origin ${branch}`);

  const commitHash = run("git rev-parse --short HEAD").trim();

  return {
    branch,
    commitHash,
    deployUrl: "https://family-assistant-six.vercel.app",
  };
}

module.exports = { runDeploy };
