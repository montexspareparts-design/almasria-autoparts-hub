/**
 * Dev-only static scanner: uses Vite's import.meta.glob with `query: '?raw'`
 * to read source code of dealer/admin components at build time, then greps
 * for legacy directional Tailwind classes.
 *
 * Returns one entry per file with the line numbers of each offense, so the
 * UI can offer a "open at line" deep link.
 */

export interface LegacyMatch {
  line: number;
  column: number;
  snippet: string;
  match: string;
}

export interface LegacyFileReport {
  file: string;          // relative path, e.g. "src/components/dealer/DealerCart.tsx"
  matches: LegacyMatch[];
}

const LEGACY_PATTERN =
  /\b(?:sm:|md:|lg:|xl:|2xl:|hover:|focus:|group-hover:)?(?:-?(?:mr|ml|pr|pl)-(?:\d+(?:\.\d+)?|px|auto|\[[^\]]+\])|text-(?:right|left))\b/g;

// Vite resolves these at build time; safe in dev. In production the bundle
// will simply include the strings (the page is dev-only anyway and lazy).
const sources = {
  ...import.meta.glob("/src/components/dealer/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("/src/components/admin/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("/src/pages/Dealer*.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

export const scanProjectForLegacyClasses = (): LegacyFileReport[] => {
  const reports: LegacyFileReport[] = [];

  for (const [absPath, source] of Object.entries(sources)) {
    if (typeof source !== "string") continue;
    const file = absPath.replace(/^\//, "");
    const lines = source.split("\n");
    const matches: LegacyMatch[] = [];

    lines.forEach((lineText, idx) => {
      LEGACY_PATTERN.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = LEGACY_PATTERN.exec(lineText)) !== null) {
        matches.push({
          line: idx + 1,
          column: m.index + 1,
          snippet: lineText.trim().slice(0, 140),
          match: m[0],
        });
      }
    });

    if (matches.length) {
      reports.push({ file, matches });
    }
  }

  // Sort: most offenders first
  reports.sort((a, b) => b.matches.length - a.matches.length);
  return reports;
};

/** Best-effort deep link into the in-IDE editor. Lovable previews don't
 *  expose a true "open file" protocol, so we fall back to copying the path.
 */
export const buildEditorLink = (file: string, line: number): string => {
  // VS Code style URL — works locally if user has the handler registered.
  return `vscode://file/${file}:${line}`;
};

/**
 * Suggest the logical-property replacement for a legacy directional class.
 * Handles variant prefixes (sm:, hover:, etc.) and negative margins.
 *
 * Examples:
 *   mr-2          → me-2
 *   ml-4          → ms-4
 *   -mr-1         → -me-1
 *   md:pr-3       → md:pe-3
 *   hover:pl-2    → hover:ps-2
 *   text-right    → text-end
 *   text-left     → text-start
 */
export const suggestReplacement = (legacyClass: string): string => {
  // Split off variant prefixes (e.g. "md:hover:pr-3" → ["md:hover:", "pr-3"])
  const variantMatch = legacyClass.match(/^((?:[a-z0-9-]+:)+)?(.*)$/);
  const prefix = variantMatch?.[1] ?? "";
  let body = variantMatch?.[2] ?? legacyClass;

  // Negative-margin support
  let negative = "";
  if (body.startsWith("-")) {
    negative = "-";
    body = body.slice(1);
  }

  // text-right / text-left
  if (body === "text-right") return `${prefix}text-end`;
  if (body === "text-left") return `${prefix}text-start`;

  // m{r,l}-* / p{r,l}-*
  const dirMatch = body.match(/^([mp])([rl])-(.+)$/);
  if (dirMatch) {
    const [, mp, rl, rest] = dirMatch;
    // r → e (end), l → s (start)
    const logical = rl === "r" ? "e" : "s";
    return `${prefix}${negative}${mp}${logical}-${rest}`;
  }

  // Fallback (shouldn't happen for tokens that matched LEGACY_PATTERN)
  return legacyClass;
};

