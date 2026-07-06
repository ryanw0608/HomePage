import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import {
  courseNoteFields,
  digestFields,
  paperReadingFields,
  refineLanguage,
  refinePaperVisibility
} from "@/lib/schema/frontmatter";

function contentId(collectionPath: string) {
  return ({ entry }: { entry: string }) =>
    entry.replace(new RegExp(`^content/${collectionPath}/`), "").replace(/\.(md|mdx)$/u, "");
}

const courseNotes = defineCollection({
  loader: glob({
    pattern: "content/course-notes/*.{md,mdx}",
    base: "./src",
    generateId: contentId("course-notes")
  }),
  schema: courseNoteFields
    .extend({ related: z.array(reference("course-notes")).default([]) })
    .superRefine(refineLanguage)
});

const paperReading = defineCollection({
  loader: glob({
    pattern: "content/paper-reading/*.{md,mdx}",
    base: "./src",
    generateId: contentId("paper-reading")
  }),
  schema: paperReadingFields
    .extend({ related: z.array(reference("paper-reading")).default([]) })
    .superRefine((entry, ctx) => {
      refineLanguage(entry, ctx);
      refinePaperVisibility(entry, ctx);
    })
});

// Agent-written weekly digests: derived summaries of the real notes,
// authored by scripts/agent/run.mjs and merged via reviewed pull requests.
const digest = defineCollection({
  loader: glob({
    pattern: "content/digest/*.{md,mdx}",
    base: "./src",
    generateId: contentId("digest")
  }),
  schema: digestFields
});

export const collections = {
  "course-notes": courseNotes,
  "paper-reading": paperReading,
  digest
};
