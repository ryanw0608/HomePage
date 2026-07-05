export const courses = {
  "ml-foundations": {
    label: "Machine Learning Foundations",
    area: "machine-learning"
  }
} as const;

export const areas = {
  "machine-learning": { label: "Machine Learning" },
  "deep-learning": { label: "Deep Learning" },
  systems: { label: "Systems" },
  "frontend-engineering": { label: "Frontend Engineering" }
} as const;

export const tags = {
  optimization: { label: "Optimization" },
  gradients: { label: "Gradients" },
  transformers: { label: "Transformers" },
  attention: { label: "Attention" },
  reading: { label: "Reading" }
} as const;

export type CourseId = keyof typeof courses;
export type AreaId = keyof typeof areas;
export type TagId = keyof typeof tags;
