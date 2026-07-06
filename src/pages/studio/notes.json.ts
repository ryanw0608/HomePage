import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

import { byDateDesc, listedEntries } from "@/lib/content";

/*
 * Build-time note index for the Studio editor's first paint. Deliberately
 * limited to LISTED entries — this JSON is publicly reachable, so private
 * and unlisted notes must never appear here. After auth, Studio replaces
 * this with the authoritative file tree from the GitHub contents API.
 */
export const GET: APIRoute = async () => {
  const courseNotes = listedEntries(await getCollection("course-notes"));
  const paperReadings = listedEntries(await getCollection("paper-reading"));

  const rows = [
    ...courseNotes.map((entry) => ({ collection: "course-notes" as const, entry })),
    ...paperReadings.map((entry) => ({ collection: "paper-reading" as const, entry }))
  ]
    .sort((a, b) => byDateDesc(a.entry, b.entry))
    .map(({ collection, entry }) => ({
      collection,
      slug: entry.id,
      filePath: entry.filePath ?? `src/content/${collection}/${entry.id}.mdx`,
      title: entry.data.title,
      date: entry.data.date.toISOString().slice(0, 10),
      updated: entry.data.updated?.toISOString().slice(0, 10),
      language: entry.data.language,
      status: entry.data.status,
      featured: entry.data.featured,
      tags: entry.data.tags
    }));

  return new Response(JSON.stringify({ notes: rows }), {
    headers: { "content-type": "application/json" }
  });
};
