export const profile = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  role: "Master's student in computer science, University of Sydney",
  location: "Sydney, Australia",
  summary:
    "I am a master's student in computer science at the University of Sydney, building a public record of course notes, paper reading, and research across efficient LLM inference, agentic systems, and AI for condensed matter physics.",
  education: [
    {
      degree: "M.S. in Computer Science",
      school: "University of Sydney"
    },
    {
      degree: "B.Eng. in Communication Engineering",
      school: "Beijing University of Posts and Telecommunications"
    }
  ],
  lab: {
    name: "Future Machine Learning & Systems Lab (FutureMLS)",
    shortName: "FutureMLS Lab",
    href: "https://futuremls.org/",
    institution: "University of Sydney"
  },
  advisors: [
    { name: "Zhongzhu Zhou", href: "https://www.zhongzhuzhou.org/" },
    { name: "Shuaiwen Leon Song", href: "https://shuaiwen-leon-song.github.io/" }
  ],
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
