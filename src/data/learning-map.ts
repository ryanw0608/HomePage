export const learningMapNodes = [
  {
    id: "machine-learning",
    label: "Machine Learning",
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
  { from: "machine-learning", to: "attention", kind: "related" }
] as const;
