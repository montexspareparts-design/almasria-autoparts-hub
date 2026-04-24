export const HEARTBEAT_TITLE_PREFIX = "__heartbeat__:";
export const VISITOR_SESSION_GAP_MS = 30 * 60 * 1000;
/** Minimum dwell time (ms) before a visitor counts as "engaged" — drops accidental opens. */
export const ENGAGED_DWELL_MS = 15 * 1000;

const PREVIEW_HOST_MARKERS = [
  "id-preview--",
  "lovableproject.com",
  "lovable.dev",
  "lovable.app",
  "localhost",
  "127.0.0.1",
];
const PREVIEW_QUERY_MARKERS = ["forcehidebadge=true", "lovable_preview"];
const INTERNAL_REFERRER_MARKERS = [
  "lovable.dev",
  "lovableproject.com",
  "lovable.app",
  "id-preview--",
];
const NOISE_PATH_PREFIXES = ["/admin", "/dev/", "/__"];
const BOT_UA_PATTERNS = [
  "bot", "crawler", "spider", "slurp", "facebookexternalhit", "headless",
  "preview", "monitor", "check", "uptime", "wget", "curl", "python-requests",
  "axios", "node-fetch", "lighthouse", "pingdom", "scrapy", "linkchecker",
];

export interface VisitLike {
  path: string;
  page_title: string | null;
  referrer: string | null;
  visited_at: string;
}

export const isPreviewHost = (hostname: string) => {
  const lower = (hostname || "").toLowerCase();
  return PREVIEW_HOST_MARKERS.some((marker) => lower.includes(marker));
};

export const isBotUserAgent = (ua?: string | null) => {
  const lower = (ua || (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!lower) return false;
  return BOT_UA_PATTERNS.some((p) => lower.includes(p));
};

export const shouldTrackBrowserVisit = (fullPath: string, hostname: string) => {
  const normalized = (fullPath || "").toLowerCase();
  const pathname = normalized.split("?")[0] || normalized;

  if (isPreviewHost(hostname)) return false;
  if (NOISE_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (PREVIEW_QUERY_MARKERS.some((marker) => normalized.includes(marker))) return false;
  if (isBotUserAgent()) return false;

  return true;
};

export const isNoiseVisit = (visit: Pick<VisitLike, "path" | "referrer">) => {
  const path = (visit.path || "").toLowerCase();
  const referrer = (visit.referrer || "").toLowerCase();

  if (NOISE_PATH_PREFIXES.some((p) => path.startsWith(p))) return true;
  if (PREVIEW_QUERY_MARKERS.some((marker) => path.includes(marker))) return true;
  if (INTERNAL_REFERRER_MARKERS.some((marker) => referrer.includes(marker))) return true;

  return false;
};

export const markHeartbeatTitle = (title?: string | null) =>
  `${HEARTBEAT_TITLE_PREFIX}${title ?? ""}`;

export const isHeartbeatVisit = (visit: Pick<VisitLike, "page_title">) =>
  Boolean(visit.page_title?.startsWith(HEARTBEAT_TITLE_PREFIX));

export const normalizeVisitTitle = (title: string | null) => {
  if (!title) return null;
  return title.startsWith(HEARTBEAT_TITLE_PREFIX)
    ? title.slice(HEARTBEAT_TITLE_PREFIX.length) || null
    : title;
};

export interface SessionGroup<T extends VisitLike> {
  start: string;
  end: string;
  durationMs: number;
  pages: T[];
  rawEvents: T[];
}

export const buildVisitSessions = <T extends VisitLike>(visits: T[]): SessionGroup<T>[] => {
  const ordered = visits
    .filter((visit) => !isNoiseVisit(visit))
    .slice()
    .sort((a, b) => new Date(a.visited_at).getTime() - new Date(b.visited_at).getTime());

  if (ordered.length === 0) return [];

  const groups: T[][] = [];
  let current: T[] = [];
  let lastTime = 0;

  for (const visit of ordered) {
    const ts = new Date(visit.visited_at).getTime();
    if (current.length === 0 || ts - lastTime <= VISITOR_SESSION_GAP_MS) {
      current.push(visit);
    } else {
      groups.push(current);
      current = [visit];
    }
    lastTime = ts;
  }

  if (current.length > 0) groups.push(current);

  return groups
    .map((group) => {
      const pages = group.filter((visit) => !isHeartbeatVisit(visit));
      const basis = pages.length > 0 ? pages : group;
      const start = basis[0].visited_at;
      const end = group[group.length - 1].visited_at;

      return {
        start,
        end,
        durationMs: Math.max(0, new Date(end).getTime() - new Date(start).getTime()),
        pages,
        rawEvents: group,
      };
    })
    .reverse();
};