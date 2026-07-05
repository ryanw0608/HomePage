export const profile = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  role: "Computer science learner and former frontend engineer",
  location: "Australia",
  summary:
    "I am building a public record of course notes, paper reading, and research interests across efficient LLM inference, agentic systems, and AI for condensed matter physics, while transitioning from frontend engineering toward academic work.",
  links: [
    { label: "GitHub", href: "https://github.com/ryanw0608" }
  ],
  currentFocus: [
    {
      id: "efficient-llm-inference",
      label: "Efficient LLM Inference",
      description:
        "Speculative decoding and system-level optimization for low-latency, high-throughput LLM serving."
    },
    {
      id: "agentic-systems",
      label: "Agentic and Multi-Agent Systems",
      description: "LLM agents, tool use, planning, collaboration, and reliable multi-agent workflows."
    },
    {
      id: "ai-condensed-matter",
      label: "AI for Condensed Matter Physics",
      description:
        "Machine learning and foundation models for physical modeling, simulation, materials, and scientific discovery."
    }
  ]
} as const;
