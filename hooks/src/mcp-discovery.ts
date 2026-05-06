/**
 * MCP Auto-Discovery - PreToolUse hook (Read tool icin)
 * Session basinda proje tipine gore MCP server onerir.
 * Sadece 1 kez calisir (session basinda ilk Read'de).
 */
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ToolEvent {
  session_id: string;
  hook_event_name?: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface McpMapping {
  name: string;
  signals: string[];
  description: string;
  install: string;
}

const MCP_MAPPINGS: McpMapping[] = [
  {
    name: 'browser-use',
    signals: ['next.config.js', 'next.config.ts', 'next.config.mjs', 'vite.config.ts', 'vite.config.js'],
    description: 'Frontend debug & browser automation',
    install: 'pip3 install --user --break-system-packages browser-use',
  },
  {
    name: 'github',
    signals: ['.github'],
    description: 'GitHub API - repos, issues, PRs',
    install: 'npx -y @modelcontextprotocol/server-github',
  },
  {
    name: 'docker',
    signals: ['docker-compose.yml', 'docker-compose.yaml'],
    description: 'Docker container management',
    install: 'npx -y @modelcontextprotocol/server-docker',
  },
  {
    name: 'postgres',
    signals: ['schema.prisma', 'migrations'],
    description: 'PostgreSQL database access',
    install: 'npx -y @modelcontextprotocol/server-postgres',
  },
  {
    name: 'kubernetes',
    signals: ['k8s', 'kubernetes', 'kustomization.yaml'],
    description: 'Kubernetes cluster management',
    install: 'npx -y @modelcontextprotocol/server-kubernetes',
  },
  {
    name: 'codebase-memory',
    signals: ['docs', 'documentation'],
    description: 'Codebase indexing & semantic search',
    install: 'Zaten kurulu: ~/bin/codebase-memory-mcp',
  },
  {
    name: 'sqlite',
    signals: [],
    description: 'SQLite database access',
    install: 'npx -y @modelcontextprotocol/server-sqlite',
  },
  {
    name: 'puppeteer',
    signals: ['playwright.config.ts', 'playwright.config.js', 'cypress.config.ts', 'cypress.config.js'],
    description: 'Browser automation & testing',
    install: 'npx -y @modelcontextprotocol/server-puppeteer',
  },
];

const STATE_FILE = join(homedir(), '.claude', 'cache', 'mcp-discovery-fired.json');

function hasAlreadyFired(sessionId: string): boolean {
  if (!existsSync(STATE_FILE)) return false;
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    return state.session === sessionId;
  } catch {
    return false;
  }
}

function markFired(sessionId: string): void {
  const cacheDir = join(homedir(), '.claude', 'cache');
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const { writeFileSync } = require('fs');
  writeFileSync(STATE_FILE, JSON.stringify({ session: sessionId, ts: new Date().toISOString() }));
}

function getInstalledMcps(): Set<string> {
  const mcpConfigPath = join(homedir(), '.mcp.json');
  if (!existsSync(mcpConfigPath)) return new Set();
  try {
    const config = JSON.parse(readFileSync(mcpConfigPath, 'utf-8'));
    return new Set(Object.keys(config.mcpServers || {}));
  } catch {
    return new Set();
  }
}

function discoverMcps(projectDir: string): McpMapping[] {
  const found: McpMapping[] = [];
  const installed = getInstalledMcps();

  for (const mapping of MCP_MAPPINGS) {
    // Zaten kuruluysa onerme
    if (installed.has(mapping.name)) continue;

    for (const signal of mapping.signals) {
      const checkPath = join(projectDir, signal);
      if (existsSync(checkPath)) {
        found.push(mapping);
        break;
      }
    }
  }

  // .sql dosyalari icin ozel kontrol
  if (!installed.has('postgres')) {
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(projectDir);
      if (files.some((f: string) => f.endsWith('.sql'))) {
        const pgMapping = MCP_MAPPINGS.find(m => m.name === 'postgres');
        if (pgMapping && !found.includes(pgMapping)) {
          found.push(pgMapping);
        }
      }
    } catch { /* dizin okunamazsa atla */ }
  }

  // .db/.sqlite dosyalari icin kontrol
  if (!installed.has('sqlite')) {
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(projectDir);
      if (files.some((f: string) => f.endsWith('.db') || f.endsWith('.sqlite'))) {
        const sqliteMapping = MCP_MAPPINGS.find(m => m.name === 'sqlite');
        if (sqliteMapping && !found.includes(sqliteMapping)) {
          found.push(sqliteMapping);
        }
      }
    } catch { /* dizin okunamazsa atla */ }
  }

  return found;
}

function main() {
  let raw = '';
  try { raw = readFileSync(0, 'utf-8'); } catch { return; }
  if (!raw) { console.log('{}'); return; }

  let input: ToolEvent;
  try { input = JSON.parse(raw); } catch { console.log('{}'); return; }

  // Sadece Read tool'unda tetiklen
  if (input.tool_name !== 'Read') {
    console.log('{}');
    return;
  }

  // Session basina 1 kez calis
  const sessionId = input.session_id || 'unknown';
  if (hasAlreadyFired(sessionId)) {
    console.log('{}');
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const recommendations = discoverMcps(projectDir);

  // Bir sey bulamadiysa sessiz kal
  if (recommendations.length === 0) {
    markFired(sessionId);
    console.log('{}');
    return;
  }

  markFired(sessionId);

  const lines = [
    '',
    '--- MCP Auto-Discovery ---',
    `Proje: ${projectDir}`,
    '',
    'Bu proje icin faydali olabilecek MCP server\'lar:',
    '',
  ];

  for (const rec of recommendations) {
    lines.push(`  * ${rec.name}: ${rec.description}`);
    lines.push(`    Kurulum: ${rec.install}`);
    lines.push('');
  }

  lines.push('~/.mcp.json dosyasina ekleyerek aktive edebilirsiniz.');
  lines.push('---');

  console.log(JSON.stringify({
    result: 'continue',
    systemMessage: lines.join('\n'),
  }));
}

main();
