import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import { absoluteEntryUrl, byDateDesc, listedEntries } from "@/lib/content";
import { site } from "@/lib/site";

export async function GET() {
  const courseNotes = listedEntries(await getCollection("course-notes"));
  const paperReadings = listedEntries(await getCollection("paper-reading"));

  const items = [
    ...courseNotes.map((entry) => ({ collection: "course-notes" as const, entry })),
    ...paperReadings.map((entry) => ({ collection: "paper-reading" as const, entry }))
  ]
    .sort((a, b) => byDateDesc(a.entry, b.entry))
    .map(({ collection, entry }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: absoluteEntryUrl(collection, entry)
    }));

  return rss({
    title: site.title,
    description: site.description,
    site: site.url,
    items
  });
}
