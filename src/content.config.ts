import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

import { areas, courses, tags } from "@/data/taxonomy";

const language = z.enum(["zh", "en", "mixed"]);
const primaryLanguage = z.enum(["zh", "en"]).optional();

const courseIds = Object.keys(courses) as [keyof typeof courses, ...(keyof typeof courses)[]];
const areaIds = Object.keys(areas) as [keyof typeof areas, ...(keyof typeof areas)[]];
const tagIds = Object.keys(tags) as [keyof typeof tags, ...(keyof typeof tags)[]];

const courseId = z.enum(courseIds);
const areaId = z.enum(areaIds);
const tagId = z.enum(tagIds);

function contentId(collectionPath: string) {
  return ({ entry }: { entry: string }) =>
    entry.replace(new RegExp(`^content/${collectionPath}/`), "").replace(/\.(md|mdx)$/u, "");
}

const sharedFrontmatter = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  summary: z.string().min(1),
  // One-sentence English takeaway. Required by site policy for zh notes so
  // indexes, RSS, and share cards stay legible to international readers.
  tldr: z.string().optional(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  // Spaced-repetition: when this note is due for a re-read.
  revisit: z.coerce.date().optional(),
  language,
  primaryLanguage,
  tags: z.array(tagId),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  math: z.boolean().default(false)
});

const courseNotes = defineCollection({
  loader: glob({
    pattern: "content/course-notes/*.{md,mdx}",
    base: "./src",
    generateId: contentId("course-notes")
  }),
  schema: sharedFrontmatter.extend({
    course: courseId,
    status: z.enum(["active", "complete", "evergreen"]),
    term: z.string().optional(),
    order: z.number().optional(),
    areas: z.array(areaId).default([]),
    related: z.array(reference("course-notes")).default([])
  }).superRefine((entry, ctx) => {
    if (entry.language === "mixed" && !entry.primaryLanguage) {
      ctx.addIssue({
        code: "custom",
        path: ["primaryLanguage"],
        message: "mixed language entries require primaryLanguage"
      });
    }
  })
});

const paperReading = defineCollection({
  loader: glob({
    pattern: "content/paper-reading/*.{md,mdx}",
    base: "./src",
    generateId: contentId("paper-reading")
  }),
  schema: sharedFrontmatter.extend({
    paperTitle: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    year: z.number().int(),
    status: z.enum(["queued", "reading", "skimmed", "reviewed", "revisit"]),
    area: areaId,
    venue: z.string().optional(),
    doi: z.string().optional(),
    arxivId: z.string().optional(),
    paperUrl: z.url().optional(),
    codeUrl: z.url().optional(),
    projectUrl: z.url().optional(),
    takeaways: z.array(z.string()).default([]),
    rating: z.number().int().min(1).max(5).optional(),
    recommendation: z.enum(["skip", "skim", "read", "must-read"]).optional(),
    reproducible: z.enum(["code+weights", "code-only", "partial", "none"]).optional(),
    related: z.array(reference("paper-reading")).default([])
  }).superRefine((entry, ctx) => {
    if (entry.language === "mixed" && !entry.primaryLanguage) {
      ctx.addIssue({
        code: "custom",
        path: ["primaryLanguage"],
        message: "mixed language entries require primaryLanguage"
      });
    }

    if (entry.status === "queued" && !entry.draft) {
      ctx.addIssue({
        code: "custom",
        path: ["draft"],
        message: "queued paper readings must be draft-only"
      });
    }
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
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    model: z.string().optional()
  })
});

export const collections = {
  "course-notes": courseNotes,
  "paper-reading": paperReading,
  digest
};
