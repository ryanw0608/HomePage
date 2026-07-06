import type { CollectionEntry } from "astro:content";

import { site } from "@/lib/site";

type VisibilityData = { draft?: boolean; visibility?: "public" | "unlisted" | "private" };

// Everything that gets BUILT: public + unlisted. Dev shows drafts too.
export function publicEntries<T extends { data: VisibilityData }>(entries: T[]): T[] {
  return import.meta.env.PROD
    ? entries.filter((entry) => !entry.data.draft && entry.data.visibility !== "private")
    : entries;
}

// Everything that gets LISTED (indexes, RSS, counts, prev/next, related):
// public only — unlisted pages are reachable by URL but never advertised.
export function listedEntries<T extends { data: VisibilityData }>(entries: T[]): T[] {
  return import.meta.env.PROD
    ? publicEntries(entries).filter((entry) => entry.data.visibility !== "unlisted")
    : entries;
}

export function byDateDesc<T extends { data: { date: Date } }>(a: T, b: T): number {
  return b.data.date.getTime() - a.data.date.getTime();
}

export function readingTime(text: string): number {
  const cjk = Array.from(text.matchAll(/[\u4e00-\u9fff]/g)).length;
  const words = text.replace(/[\u4e00-\u9fff]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(cjk / 450 + words / 220));
}

export function entrySlug(entry: { id: string }): string {
  return entry.id;
}

export function entryPath(collection: "course-notes" | "paper-reading", entry: { id: string }): string {
  return `${import.meta.env.BASE_URL}${collection}/${entry.id}/`;
}

export function absoluteEntryUrl(collection: "course-notes" | "paper-reading", entry: { id: string }): string {
  return new URL(`${collection}/${entry.id}/`, site.url).toString();
}

export type CourseNote = CollectionEntry<"course-notes">;
export type PaperReading = CollectionEntry<"paper-reading">;
