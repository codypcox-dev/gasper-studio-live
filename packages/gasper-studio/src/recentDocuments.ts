/**
 * Bounded recent-document list (max 10) for Gasper Studio.
 * Uses localStorage when available; in-memory fallback for tests.
 */

const KEY = "gasper-studio.recent-documents.v1";
const MAX = 10;

export type RecentDocumentEntry = {
  path: string;
  name: string;
  openedAt: string;
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

function basename(path: string): string {
  const n = normalizePath(path);
  const i = Math.max(n.lastIndexOf("/"), n.lastIndexOf("\\"));
  return i >= 0 ? n.slice(i + 1) : n;
}

function store(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    /* */
  }
  return null;
}

let memory: RecentDocumentEntry[] = [];

export function listRecentDocuments(): RecentDocumentEntry[] {
  const s = store();
  if (!s) return [...memory];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentDocumentEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.path === "string" && e.path.length > 0)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberRecentDocument(path: string): RecentDocumentEntry[] {
  const norm = normalizePath(path);
  if (!norm) return listRecentDocuments();
  const entry: RecentDocumentEntry = {
    path: norm,
    name: basename(norm),
    openedAt: new Date().toISOString(),
  };
  const rest = listRecentDocuments().filter(
    (e) => normalizePath(e.path).toLowerCase() !== norm.toLowerCase(),
  );
  const next = [entry, ...rest].slice(0, MAX);
  const s = store();
  if (s) {
    try {
      s.setItem(KEY, JSON.stringify(next));
    } catch {
      memory = next;
    }
  } else {
    memory = next;
  }
  return next;
}

export function removeRecentDocument(path: string): RecentDocumentEntry[] {
  const norm = normalizePath(path).toLowerCase();
  const next = listRecentDocuments().filter(
    (e) => normalizePath(e.path).toLowerCase() !== norm,
  );
  const s = store();
  if (s) {
    try {
      s.setItem(KEY, JSON.stringify(next));
    } catch {
      memory = next;
    }
  } else {
    memory = next;
  }
  return next;
}

export function lastRecentDirectory(): string | null {
  const first = listRecentDocuments()[0];
  if (!first) return null;
  const p = normalizePath(first.path);
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : null;
}
