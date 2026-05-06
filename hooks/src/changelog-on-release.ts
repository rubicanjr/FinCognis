/**
 * Changelog on Release - Stop hook
 * Session sonunda yapilan commit'leri ozetler.
 * Conventional commit formatinda parse eder ve changelog ozeti olusturur.
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

interface ParsedCommit {
  type: string;
  scope: string;
  description: string;
  breaking: boolean;
  hash: string;
}

type ChangelogSection = 'Added' | 'Fixed' | 'Changed' | 'Security' | 'Removed';

const TYPE_TO_SECTION: Record<string, ChangelogSection> = {
  feat: 'Added',
  fix: 'Fixed',
  refactor: 'Changed',
  perf: 'Changed',
  revert: 'Removed',
};

const SKIP_TYPES = new Set(['docs', 'style', 'test', 'chore', 'ci', 'build']);

function parseConventionalCommit(message: string, hash: string): ParsedCommit | null {
  // feat(scope)!: description veya feat: description
  const match = message.match(/^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/);
  if (!match) return null;

  const [, type, scope, bang, description] = match;
  const breaking = !!bang || message.includes('BREAKING CHANGE');

  return {
    type: type.toLowerCase(),
    scope: scope || '',
    description,
    breaking,
    hash,
  };
}

function getSessionCommits(): ParsedCommit[] {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  try {
    // Son 2 saat icindeki commit'leri al (session suresi icin yeterli)
    const raw = execSync(
      'git log --since="2 hours ago" --pretty=format:"%h|||%s" --no-merges 2>/dev/null',
      { cwd: projectDir, encoding: 'utf-8', timeout: 5000 }
    ).trim();

    if (!raw) return [];

    const commits: ParsedCommit[] = [];
    for (const line of raw.split('\n')) {
      const [hash, ...rest] = line.split('|||');
      const message = rest.join('|||');
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

function buildChangelog(commits: ParsedCommit[]): string {
  const sections: Record<string, string[]> = {};
  const breakingChanges: string[] = [];

  for (const commit of commits) {
    if (SKIP_TYPES.has(commit.type)) continue;

    const section = TYPE_TO_SECTION[commit.type] || 'Changed';
    if (!sections[section]) sections[section] = [];

    const scope = commit.scope ? `**${commit.scope}**: ` : '';
    sections[section].push(`${scope}${commit.description} (${commit.hash})`);

    if (commit.breaking) {
      breakingChanges.push(`${scope}${commit.description}`);
    }
  }

  const lines: string[] = [];
  lines.push('--- Session Changelog ---');
  lines.push('');

  if (breakingChanges.length > 0) {
    lines.push('BREAKING CHANGES:');
    for (const bc of breakingChanges) {
      lines.push(`  ! ${bc}`);
    }
    lines.push('');
  }

  const sectionOrder: ChangelogSection[] = ['Added', 'Changed', 'Fixed', 'Security', 'Removed'];
  for (const section of sectionOrder) {
    const items = sections[section];
    if (!items || items.length === 0) continue;

    lines.push(`${section}:`);
    for (const item of items) {
      lines.push(`  - ${item}`);
    }
    lines.push('');
  }

  // Non-conventional commit'leri de say
  const skippedCount = commits.filter(c => SKIP_TYPES.has(c.type)).length;
  const nonConventional = commits.length - Object.values(sections).reduce((a, b) => a + b.length, 0) - skippedCount;

  if (skippedCount > 0) {
    lines.push(`(${skippedCount} docs/test/chore commit atildi)`);
  }

  lines.push('---');

  return lines.join('\n');
}

function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf-8'); } catch { return; }
  if (!raw) { console.log(JSON.stringify({ result: 'continue' })); return; }

  let input: SessionEndInput;
  try { input = JSON.parse(raw); } catch { console.log(JSON.stringify({ result: 'continue' })); return; }

  // Auto-compaction'da calisma
  if (input.reason === 'other') {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  const commits = getSessionCommits();

  // Commit yoksa sessiz kal
  if (commits.length === 0) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // changelog icin sadece anlamli commit'leri filtrele
  const meaningful = commits.filter(c => !SKIP_TYPES.has(c.type));
  if (meaningful.length === 0) {
    console.log(JSON.stringify({
      result: 'continue',
      systemMessage: `\n--- Session: ${commits.length} commit (tumu docs/test/chore) ---`,
    }));
    return;
  }

  const changelog = buildChangelog(commits);

  console.log(JSON.stringify({
    result: 'continue',
    systemMessage: `\n${changelog}`,
  }));
}

main();
