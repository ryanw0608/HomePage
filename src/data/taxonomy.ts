export const areas = {
  "machine-learning": { label: "Machine Learning" },
  "deep-learning": { label: "Deep Learning" },
  systems: { label: "Systems" },
  "efficient-inference": { label: "Efficient Inference" },
  "agentic-systems": { label: "Agentic Systems" },
  "ai-for-science": { label: "AI for Science" },
  "frontend-engineering": { label: "Frontend Engineering" }
} as const;

export const courses = {
  "ml-foundations": {
    label: "Machine Learning Foundations",
    area: "machine-learning"
  }
} as const satisfies Record<string, { label: string; area: keyof typeof areas }>;

export const tags = {
  optimization: { label: "Optimization" },
  gradients: { label: "Gradients" },
  transformers: { label: "Transformers" },
  attention: { label: "Attention" },
  reading: { label: "Reading" },
  "speculative-decoding": { label: "Speculative Decoding" },
  "llm-serving": { label: "LLM Serving" },
  "kv-cache": { label: "KV Cache" },
  quantization: { label: "Quantization" },
  agents: { label: "Agents" },
  "multi-agent": { label: "Multi-Agent" },
  "tool-use": { label: "Tool Use" },
  "ml-for-physics": { label: "ML for Physics" },
  "materials-science": { label: "Materials Science" }
} as const;

export type CourseId = keyof typeof courses;
export type AreaId = keyof typeof areas;
export type TagId = keyof typeof tags;
