export const learningMapNodes = [
  {
    id: "efficient-llm-inference",
    label: "Efficient LLM Inference",
    type: "area",
    summary: "Speculative decoding and system-level optimization for low-latency, high-throughput serving."
  },
  {
    id: "agentic-systems",
    label: "Agentic and Multi-Agent Systems",
    type: "area",
    summary: "LLM agents, tool use, planning, collaboration, and reliable multi-agent workflows."
  },
  {
    id: "ai-condensed-matter",
    label: "AI for Condensed Matter Physics",
    type: "area",
    summary: "Machine learning and foundation models for physical modeling, simulation, and materials."
  },
  {
    id: "machine-learning",
    label: "Machine Learning Foundations",
    type: "area",
    summary: "Optimization, gradients, model families, and reading foundations."
  },
  {
    id: "attention",
    label: "Attention",
    type: "method",
    summary: "A core neural network mechanism explored through paper reading."
  }
] as const;

export const learningMapEdges = [
  { from: "machine-learning", to: "attention", kind: "related" },
  { from: "attention", to: "efficient-llm-inference", kind: "applies-to" },
  { from: "machine-learning", to: "ai-condensed-matter", kind: "related" }
] as const;
