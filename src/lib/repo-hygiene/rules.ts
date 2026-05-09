export interface MislocatedEntity {
  file: string;
  reason: string;
  recommendedPath: string;
}

const HOOK_EXPORT_PATTERN =
  /\bexport\s+(?:const|function)\s+(use[A-Z][A-Za-z0-9_]*)\b/;

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toPosixPath(input: string): string {
  return input.replace(/\\/g, "/");
}

function basenameWithoutExt(path: string): string {
  const normalized = toPosixPath(path);
  const fileName = normalized.split("/").pop() ?? normalized;
  return fileName.replace(/\.[^.]+$/, "");
}

function dirname(path: string): string {
  const normalized = toPosixPath(path);
  const idx = normalized.lastIndexOf("/");
  return idx === -1 ? "" : normalized.slice(0, idx);
}

export function detectMislocatedHook(
  filePath: string,
  content: string,
): MislocatedEntity | null {
  const normalizedPath = toPosixPath(filePath);
  if (!normalizedPath.includes("/src/components/")) {
    return null;
  }
  const base = basenameWithoutExt(normalizedPath);
  const looksLikeHookFile =
    /^use[A-Z]/.test(base) || /^use-[a-z0-9-]+$/.test(base);
  if (!looksLikeHookFile) {
    return null;
  }
  const match = content.match(HOOK_EXPORT_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  const hookName = match[1];
  return {
    file: normalizedPath,
    reason: `Hook export '${hookName}' is located under components.`,
    recommendedPath: `/src/hooks/${hookName}.ts`,
  };
}

export function detectFileNamingViolation(filePath: string): string | null {
  const normalizedPath = toPosixPath(filePath);
  const base = basenameWithoutExt(normalizedPath);
  const ext = normalizedPath.split(".").pop()?.toLowerCase() ?? "";
  if (base === "index" || base.startsWith("_")) {
    return null;
  }
  if (normalizedPath.includes("/src/components/")) {
    if (ext !== "tsx" && ext !== "jsx") {
      return kebabCasePattern.test(base)
        ? null
        : `File should use kebab-case: ${base}`;
    }
    const pascalCase = /^[A-Z][A-Za-z0-9]*$/;
    return pascalCase.test(base)
      ? null
      : `Component file should use PascalCase: ${base}`;
  }
  return kebabCasePattern.test(base)
    ? null
    : `File should use kebab-case: ${base}`;
}

export function suggestMoveDestination(
  filePath: string,
  entity: MislocatedEntity,
): string {
  const sourceDir = dirname(filePath);
  const target = entity.recommendedPath.startsWith("/src/")
    ? entity.recommendedPath.replace("/src/", "/src/")
    : entity.recommendedPath;
  return `Move '${sourceDir}' item to '${target}'.`;
}
