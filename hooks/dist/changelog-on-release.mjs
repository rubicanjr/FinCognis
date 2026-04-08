// src/changelog-on-release.ts
import { readFileSync } from "fs";
import { execSync } from "child_process";
var TYPE_TO_SECTION = {
  feat: "Added",
  fix: "Fixed",
  refactor: "Changed",
  perf: "Changed",
  revert: "Removed"
};
var SKIP_TYPES = /* @__PURE__ */ new Set(["docs", "style", "test", "chore", "ci", "build"]);
function parseConventionalCommit(message, hash) {
  const match = message.match(/^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/);
  if (!match) return null;
  const [, type, scope, bang, description] = match;
  const breaking = !!bang || message.includes("BREAKING CHANGE");
  return {
    type: type.toLowerCase(),
    scope: scope || "",
    description,
    breaking,
    hash
  };
}
function getSessionCommits() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const raw = execSync(
      'git log --since="2 hours ago" --pretty=format:"%h|||%s" --no-merges 2>/dev/null',
      { cwd: projectDir, encoding: "utf-8", timeout: 5e3 }
    ).trim();
    if (!raw) return [];
    const commits = [];
    for (const line of raw.split("\n")) {
      const [hash, ...rest] = line.split("|||");
      const message = rest.join("|||");
      if (!hash || !message) continue;
      const parsed = parseConventionalCommit(message, hash);
      if (parsed) {
        commits.push(parsed);
      }
    }
    return commits;
  } catch {
    return [];
  }
}
function buildChangelog(commits) {
  const sections = {};
  const breakingChanges = [];
  for (const commit of commits) {
    if (SKIP_TYPES.has(commit.type)) continue;
    const section = TYPE_TO_SECTION[commit.type] || "Changed";
    if (!sections[section]) sections[section] = [];
    const scope = commit.scope ? `**${commit.scope}**: ` : "";
    sections[section].push(`${scope}${commit.description} (${commit.hash})`);
    if (commit.breaking) {
      breakingChanges.push(`${scope}${commit.description}`);
    }
  }
  const lines = [];
  lines.push("--- Session Changelog ---");
  lines.push("");
  if (breakingChanges.length > 0) {
    lines.push("BREAKING CHANGES:");
    for (const bc of breakingChanges) {
      lines.push(`  ! ${bc}`);
    }
    lines.push("");
  }
  const sectionOrder = ["Added", "Changed", "Fixed", "Security", "Removed"];
  for (const section of sectionOrder) {
    const items = sections[section];
    if (!items || items.length === 0) continue;
    lines.push(`${section}:`);
    for (const item of items) {
      lines.push(`  - ${item}`);
    }
    lines.push("");
  }
  const skippedCount = commits.filter((c) => SKIP_TYPES.has(c.type)).length;
  const nonConventional = commits.length - Object.values(sections).reduce((a, b) => a + b.length, 0) - skippedCount;
  if (skippedCount > 0) {
    lines.push(`(${skippedCount} docs/test/chore commit atildi)`);
  }
  lines.push("---");
  return lines.join("\n");
}
function main() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf-8");
  } catch {
    return;
  }
  if (!raw) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.reason === "other") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const commits = getSessionCommits();
  if (commits.length === 0) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const meaningful = commits.filter((c) => !SKIP_TYPES.has(c.type));
  if (meaningful.length === 0) {
    console.log(JSON.stringify({
      result: "continue",
      systemMessage: `
--- Session: ${commits.length} commit (tumu docs/test/chore) ---`
    }));
    return;
  }
  const changelog = buildChangelog(commits);
  console.log(JSON.stringify({
    result: "continue",
    systemMessage: `
${changelog}`
  }));
}
main();
