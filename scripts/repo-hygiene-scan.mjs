import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");
const reportDir = path.join(projectRoot, "docs", "reports");
const reportPath = path.join(reportDir, "repo-hygiene-report.md");

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const IMPORT_RE =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\sfrom\s*)?["'`]([^"'`]+)["'`]/g;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

const COMPONENT_PATH_RE = /[\\/]src[\\/]components[\\/]/;
const PASCAL_CASE_RE = /^[A-Z][A-Za-z0-9]*$/;
const KEBAB_CASE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOOK_EXPORT_RE =
  /\bexport\s+(?:const|function)\s+(use[A-Z][A-Za-z0-9_]*)\b/;

function toPosix(inputPath) {
  return inputPath.replace(/\\/g, "/");
}

function isCodeFile(filePath) {
  return CODE_EXTENSIONS.includes(path.extname(filePath));
}

function isIgnoredScanFile(filePath) {
  const rel = toPosix(path.relative(projectRoot, filePath));
  if (!rel.startsWith("src/")) {
    return true;
  }
  return (
    rel.endsWith(".d.ts") ||
    rel.includes("/__tests__/") ||
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx") ||
    rel.endsWith(".spec.ts") ||
    rel.endsWith(".spec.tsx")
  );
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return fullPath;
    }),
  );
  return nested.flat();
}

function extractImportSpecifiers(content) {
  const values = new Set();
  let match = IMPORT_RE.exec(content);
  while (match) {
    if (match[1]) {
      values.add(match[1]);
    }
    match = IMPORT_RE.exec(content);
  }

  let dynamicMatch = DYNAMIC_IMPORT_RE.exec(content);
  while (dynamicMatch) {
    if (dynamicMatch[1]) {
      values.add(dynamicMatch[1]);
    }
    dynamicMatch = DYNAMIC_IMPORT_RE.exec(content);
  }
  return [...values];
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    return null;
  }

  const basePath = specifier.startsWith("@/")
    ? path.join(srcRoot, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);

  const candidates = [
    basePath,
    ...CODE_EXTENSIONS.map((ext) => `${basePath}${ext}`),
    ...CODE_EXTENSIONS.map((ext) => path.join(basePath, `index${ext}`)),
  ];

  const normalizedCandidates = candidates.map((candidate) =>
    path.normalize(candidate),
  );
  return normalizedCandidates.find((candidate) => analyzedFilesSet.has(candidate)) ?? null;
}

function isEntryPoint(filePath) {
  const rel = toPosix(path.relative(projectRoot, filePath));
  return (
    rel === "src/main.tsx" ||
    rel === "src/index.tsx" ||
    rel === "src/app/layout.tsx" ||
    rel === "src/app/page.tsx" ||
    rel.endsWith("/page.tsx") ||
    rel.endsWith("/route.ts") ||
    rel.endsWith("/route.tsx") ||
    rel.endsWith("/loading.tsx") ||
    rel.endsWith("/error.tsx")
  );
}

function detectNamingViolation(filePath) {
  const rel = toPosix(path.relative(projectRoot, filePath));
  const base = path.basename(filePath).replace(/\.[^.]+$/, "");
  const ext = path.extname(filePath).toLowerCase();
  if (base === "index" || base.startsWith("_")) {
    return null;
  }
  if (COMPONENT_PATH_RE.test(filePath)) {
    if (ext !== ".tsx" && ext !== ".jsx") {
      return KEBAB_CASE_RE.test(base)
        ? null
        : `[${rel}] File should be kebab-case`;
    }
    return PASCAL_CASE_RE.test(base)
      ? null
      : `[${rel}] Component file should be PascalCase`;
  }
  return KEBAB_CASE_RE.test(base)
    ? null
    : `[${rel}] File should be kebab-case`;
}

function detectMislocatedEntity(filePath, content) {
  const rel = toPosix(path.relative(projectRoot, filePath));
  if (!rel.includes("src/components/")) {
    return null;
  }
  const base = path.basename(filePath).replace(/\.[^.]+$/, "");
  const looksLikeHookFile =
    /^use[A-Z]/.test(base) || /^use-[a-z0-9-]+$/.test(base);
  if (!looksLikeHookFile) {
    return null;
  }
  const hook = content.match(HOOK_EXPORT_RE)?.[1];
  if (!hook) {
    return null;
  }
  return {
    file: rel,
    reason: `Hook export '${hook}' is under components`,
    recommendation: `git mv ${rel} src/hooks/${hook}.ts`,
  };
}

function detectSmellyDependency(importer, imported) {
  const importerRel = toPosix(path.relative(projectRoot, importer));
  const importedRel = toPosix(path.relative(projectRoot, imported));
  const importerMatch = importerRel.match(/^src\/features\/([^/]+)\//);
  const importedMatch = importedRel.match(/^src\/features\/([^/]+)\//);
  if (!importerMatch || !importedMatch) {
    return null;
  }
  if (importerMatch[1] === importedMatch[1]) {
    return null;
  }
  return `${importerRel} imports peer feature ${importedRel}`;
}

function buildReportMarkdown({
  orphanedFiles,
  mislocatedEntities,
  smellyDependencies,
  violations,
  namingViolations,
  redundantBarrels,
  allCount,
}) {
  const section = (title, items) => {
    if (!items.length) {
      return `## ${title}\n- None\n`;
    }
    return `## ${title}\n${items.map((item) => `- ${item}`).join("\n")}\n`;
  };

  return `# Repository Hygiene Report

Generated: ${new Date().toISOString()}
Scanned source files: ${allCount}

${section(
  "[ORPHANED_FILES]",
  orphanedFiles.map((file) => `${toPosix(path.relative(projectRoot, file))} (incoming refs: 0)`),
)}
${section(
  "[MISLOCATED_ENTITIES]",
  mislocatedEntities.map((item) => {
    const importers = item.importers.length
      ? ` Importers to adjust: ${item.importers.join(", ")}`
      : "";
    return `${item.file} -> ${item.reason}. Recommendation: ${item.recommendation}.${importers}`;
  }),
)}
${section("[SMELLY_DEPENDENCIES]", smellyDependencies)}
${section(
  "[VIOLATIONS]",
  violations.map((item) => `${item.file} (${item.lines} lines, limit 450)`),
)}
${section("[NAMING]", namingViolations)}
${section(
  "[REDUNDANT_BARRELS]",
  redundantBarrels.map((item) => `${item.file} (${item.exportCount} export)`),
)}
`;
}

const allFiles = (await walk(srcRoot)).filter(
  (file) => isCodeFile(file) && !isIgnoredScanFile(file),
);
const analyzedFilesSet = new Set(allFiles.map((file) => path.normalize(file)));

const importedTargets = new Set();
const incomingByTarget = new Map();
const smellyDependencies = [];
const mislocatedEntities = [];
const violations = [];
const namingViolations = [];
const redundantBarrels = [];

for (const filePath of allFiles) {
  const content = await fs.readFile(filePath, "utf8");

  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > 450) {
    violations.push({
      file: toPosix(path.relative(projectRoot, filePath)),
      lines: lineCount,
    });
  }

  const namingViolation = detectNamingViolation(filePath);
  if (namingViolation) {
    namingViolations.push(namingViolation);
  }

  const mislocated = detectMislocatedEntity(filePath, content);
  if (mislocated) {
    mislocatedEntities.push(mislocated);
  }

  const importSpecifiers = extractImportSpecifiers(content);
  if (path.basename(filePath).startsWith("index.")) {
    const exportCount = (content.match(/\bexport\b/g) ?? []).length;
    if (exportCount === 1) {
      redundantBarrels.push({
        file: toPosix(path.relative(projectRoot, filePath)),
        exportCount,
      });
    }
  }
  for (const specifier of importSpecifiers) {
    const resolved = resolveImport(filePath, specifier);
    if (!resolved) {
      continue;
    }
    importedTargets.add(resolved);
    const list = incomingByTarget.get(resolved) ?? [];
    list.push(toPosix(path.relative(projectRoot, filePath)));
    incomingByTarget.set(resolved, list);
    const smelly = detectSmellyDependency(filePath, resolved);
    if (smelly) {
      smellyDependencies.push(smelly);
    }
  }
}

const mislocatedWithImporters = mislocatedEntities.map((item) => {
  const absolute = path.normalize(path.join(projectRoot, item.file));
  return {
    ...item,
    importers: [...new Set(incomingByTarget.get(absolute) ?? [])].sort(),
  };
});

const orphanedFiles = allFiles
  .filter((filePath) => !isEntryPoint(filePath))
  .filter((filePath) => !importedTargets.has(path.normalize(filePath)))
  .sort((a, b) => a.localeCompare(b));

const markdown = buildReportMarkdown({
  orphanedFiles,
  mislocatedEntities: mislocatedWithImporters,
  smellyDependencies: [...new Set(smellyDependencies)].sort(),
  violations: violations.sort((a, b) => b.lines - a.lines),
  namingViolations: [...new Set(namingViolations)].sort(),
  redundantBarrels: redundantBarrels.sort((a, b) => a.file.localeCompare(b.file)),
  allCount: allFiles.length,
});

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(reportPath, markdown, "utf8");

const jsonSummaryPath = path.join(reportDir, "repo-hygiene-summary.json");
await fs.writeFile(
  jsonSummaryPath,
  JSON.stringify(
    {
      scanned: allFiles.length,
      orphaned: orphanedFiles.length,
      mislocated: mislocatedEntities.length,
      smelly: [...new Set(smellyDependencies)].length,
      violations: violations.length,
      naming: [...new Set(namingViolations)].length,
      redundantBarrels: redundantBarrels.length,
      reportPath: toPosix(path.relative(projectRoot, reportPath)),
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Report written: ${reportPath}`);
