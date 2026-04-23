/**
 * Dev-only auditor: scans the DOM for legacy directional Tailwind classes
 * (mr-*, ml-*, pr-*, pl-*, text-right, text-left) and warns in the console.
 *
 * Active only when `import.meta.env.DEV` is true. No-op in production builds.
 */

const LEGACY_PATTERN =
  /\b(?:sm:|md:|lg:|xl:|2xl:|hover:|focus:|group-hover:)?(?:-?(?:mr|ml|pr|pl)-(?:\d+(?:\.\d+)?|px|auto|\[[^\]]+\])|text-(?:right|left))\b/;

const LEGACY_PATTERN_GLOBAL = new RegExp(LEGACY_PATTERN.source, "g");

export interface DirectionalOffender {
  tag: string;
  classes: string[];
  preview: string;
}

export const scanForLegacyDirectional = (
  root: HTMLElement | Document = document,
): DirectionalOffender[] => {
  const offenders: DirectionalOffender[] = [];
  const seen = new WeakSet<Element>();
  const elements = root.querySelectorAll<HTMLElement>("[class]");

  elements.forEach((el) => {
    if (seen.has(el)) return;
    const cls = el.getAttribute("class") || "";
    const matches = cls.match(LEGACY_PATTERN_GLOBAL);
    if (matches && matches.length) {
      seen.add(el);
      offenders.push({
        tag: el.tagName.toLowerCase(),
        classes: Array.from(new Set(matches)),
        preview: (el.textContent || "").trim().slice(0, 60),
      });
    }
  });

  return offenders;
};

let lastReportedKey = "";

export const auditDirectionalAndWarn = (
  scope: string,
  root: HTMLElement | Document = document,
): DirectionalOffender[] => {
  if (!import.meta.env.DEV) return [];
  const offenders = scanForLegacyDirectional(root);
  if (offenders.length === 0) return offenders;

  // Deduplicate identical reports across re-renders of the same scope
  const key = `${scope}::${offenders.length}::${offenders
    .slice(0, 5)
    .map((o) => o.classes.join("|"))
    .join("##")}`;
  if (key === lastReportedKey) return offenders;
  lastReportedKey = key;

  // eslint-disable-next-line no-console
  console.group(
    `%c[RTL Audit] ${offenders.length} legacy directional class${offenders.length > 1 ? "es" : ""} found in ${scope}`,
    "color:#b45309;background:#fef3c7;padding:2px 6px;border-radius:4px;font-weight:bold;",
  );
  // eslint-disable-next-line no-console
  console.warn(
    "Replace mr/ml → ms/me, pr/pl → ps/pe, text-right/left → text-start/end for full RTL/LTR support.",
  );
  // eslint-disable-next-line no-console
  console.table(
    offenders.slice(0, 25).map((o) => ({
      tag: o.tag,
      legacy: o.classes.join(" "),
      text: o.preview,
    })),
  );
  if (offenders.length > 25) {
    // eslint-disable-next-line no-console
    console.warn(`…and ${offenders.length - 25} more.`);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();

  return offenders;
};
