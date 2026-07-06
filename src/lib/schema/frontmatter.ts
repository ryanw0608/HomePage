/*
 * Shared frontmatter field schemas — the single source of truth for note
 * metadata, consumed by BOTH build-time validation (src/content.config.ts)
 * and the Studio editor's browser-side Properties panel. Keep this module
 * free of Astro-only imports (`astro:content` reference()/defineCollection
 * live in content.config.ts); "astro/zod" is a plain zod re-export that
 * bundles fine for the browser.
 */
import { z } from "astro/zod";

import { areas, courses, tags } from "@/data/taxonomy";

export const languageSchema = z.enum(["zh", "en", "mixed"]);
export const primaryLanguageSchema = z.enum(["zh", "en"]);

// Page-level visibility: public (built + listed), unlisted (built, reachable
// by URL only — excluded from indexes, search, RSS, and robots), private
// (never built). `draft: true` is the legacy equivalent of private and keeps
// working; use it for work-in-progress, `visibility` for published pages.
export const visibilitySchema = z.enum(["public", "unlisted", "private"]);

const courseIds = Object.keys(courses) as [keyof typeof courses, ...(keyof typeof courses)[]];
const areaIds = Object.keys(areas) as [keyof typeof areas, ...(keyof typeof areas)[]];
const tagIds = Object.keys(tags) as [keyof typeof tags, ...(keyof typeof tags)[]];

export const courseIdSchema = z.enum(courseIds);
export const areaIdSchema = z.enum(areaIds);
export const tagIdSchema = z.enum(tagIds);

export const courseNoteStatusSchema = z.enum(["active", "complete", "evergreen"]);
export const paperStatusSchema = z.enum(["queued", "reading", "skimmed", "reviewed", "revisit"]);
export const recommendationSchema = z.enum(["skip", "skim", "read", "must-read"]);
export const reproducibleSchema = z.enum(["code+weights", "code-only", "partial", "none"]);

export const sharedFields = z.object({
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
  language: languageSchema,
  primaryLanguage: primaryLanguageSchema.optional(),
  tags: z.array(tagIdSchema),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  visibility: visibilitySchema.default("public"),
  math: z.boolean().default(false)
});

// `related` (cross-note references) is added in content.config.ts with
// Astro's reference() helper; Studio treats it as a plain slug array.
export const courseNoteFields = sharedFields.extend({
  course: courseIdSchema,
  status: courseNoteStatusSchema,
  term: z.string().optional(),
  order: z.number().optional(),
  areas: z.array(areaIdSchema).default([])
});

export const paperReadingFields = sharedFields.extend({
  paperTitle: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  year: z.number().int(),
  status: paperStatusSchema,
  area: areaIdSchema,
  venue: z.string().optional(),
  doi: z.string().optional(),
  arxivId: z.string().optional(),
  paperUrl: z.url().optional(),
  codeUrl: z.url().optional(),
  projectUrl: z.url().optional(),
  takeaways: z.array(z.string()).default([]),
  rating: z.number().int().min(1).max(5).optional(),
  recommendation: recommendationSchema.optional(),
  reproducible: reproducibleSchema.optional()
});

export const digestFields = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
  summary: z.string().min(1),
  model: z.string().optional()
});

type LanguageEntry = {
  language: z.infer<typeof languageSchema>;
  primaryLanguage?: z.infer<typeof primaryLanguageSchema>;
};

export function refineLanguage(entry: LanguageEntry, ctx: z.RefinementCtx): void {
  if (entry.language === "mixed" && !entry.primaryLanguage) {
    ctx.addIssue({
      code: "custom",
      path: ["primaryLanguage"],
      message: "mixed language entries require primaryLanguage"
    });
  }
}

type PaperVisibilityEntry = {
  status: z.infer<typeof paperStatusSchema>;
  draft: boolean;
  visibility: z.infer<typeof visibilitySchema>;
};

export function refinePaperVisibility(entry: PaperVisibilityEntry, ctx: z.RefinementCtx): void {
  if (entry.status === "queued" && !entry.draft && entry.visibility !== "private") {
    ctx.addIssue({
      code: "custom",
      path: ["draft"],
      message: "queued paper readings must be draft or visibility: private"
    });
  }
}
