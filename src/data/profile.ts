export const profile = {
  name: "Yongzhe Wang",
  secondaryName: "Wang Yongzhe",
  role: "Computer science learner and former frontend engineer",
  location: "Australia",
  summary:
    "I am building a public record of course notes, paper reading, and research interests while transitioning from frontend engineering toward academic work.",
  links: [
    { label: "GitHub", href: "https://github.com/ryanw0608" }
  ],
  currentFocus: [
    {
      id: "machine-learning",
      label: "Machine Learning Foundations",
      description: "Optimization, gradients, representation learning, and core model families."
    },
    {
      id: "paper-reading",
      label: "Paper Reading",
      description: "Structured reviews that capture ideas, assumptions, limitations, and follow-up questions."
    },
    {
      id: "frontend-engineering",
      label: "Frontend Craft",
      description: "High-quality reading interfaces, typography, accessibility, and long-lived static sites."
    }
  ]
} as const;
