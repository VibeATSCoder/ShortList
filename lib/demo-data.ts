import type {
  JobProfile,
  RubricScore,
  ScreeningResult,
} from "@/lib/types";

export const DEMO_JOB: JobProfile = {
  title: "Solo AI Builder / Full-Stack AI Engineer",
  description:
    "Build and ship functional AI products from a blank page in days, not months. The role needs a high-agency full-stack builder who uses LLMs and coding agents at high velocity, chooses stacks pragmatically, assembles managed services such as Supabase, Firebase, and Vercel, bridges APIs with automation or Python, and can independently own product UI, backend architecture, testing, and deployment. Evidence of solo delivery, quantified product outcomes, modern TypeScript/React or equivalent web experience, practical AI orchestration, API integration, and fast deployment matters more than degrees or stack loyalty. The builder should communicate trade-offs clearly, work without detailed requirements, and keep a human-centered product mindset.",
};

function rubric(
  scores: [number, number, number, number, number, number],
  evidence: [string, string, string, string, string, string],
): RubricScore[] {
  const definitions = [
    ["core_skills", "Core skills", 30],
    ["relevant_experience", "Relevant experience", 20],
    ["demonstrated_impact", "Demonstrated impact", 20],
    ["ownership_delivery", "Ownership & delivery", 15],
    ["role_context", "Role context", 10],
    ["communication", "Communication clarity", 5],
  ] as const;

  return definitions.map(([key, label, maxScore], index) => ({
    key,
    label,
    maxScore,
    score: scores[index],
    rationale: evidence[index],
    evidence: [evidence[index]],
  }));
}

const baseMeta = {
  model: "gpt-5.4-mini · seeded evaluation",
  promptVersion: "screen-v1.0.0",
  requestId: null,
  assessedAt: "2026-07-13T09:30:00.000Z",
};

export const DEMO_CANDIDATES: ScreeningResult[] = [
  {
    id: "demo-mina",
    fileName: "mina-khosravi-resume.pdf",
    source: "demo",
    profile: {
      displayName: "Mina Khosravi",
      currentRole: "Founding AI Product Engineer",
      yearsExperience: 4.5,
    },
    score: 93,
    recommendation: "strong_match",
    confidence: "high",
    verdict: "Rare evidence of fast, end-to-end AI product delivery with measured outcomes.",
    summary:
      "Mina has repeatedly owned the full path from user problem to deployed AI product. Her resume combines practical LLM orchestration, strong TypeScript/Python delivery, managed infrastructure, and unusually specific evidence of speed and adoption.",
    rubric: rubric(
      [28, 19, 18, 15, 9, 4],
      [
        "Built production systems with Next.js, Python, OpenAI, Supabase, and workflow automation.",
        "Four years of directly relevant product engineering, including a founding-engineer role.",
        "Reports a 63% reduction in support handling time and 41% weekly user adoption.",
        "Shipped the first paid pilot solo in nine days, including product, backend, and deployment.",
        "Worked successfully with ambiguous founder briefs and remote cross-functional users.",
        "Bullets are specific and credible, though one project omits baseline volume.",
      ],
    ),
    mustHaves: [
      {
        requirement: "Shipped an AI product solo",
        status: "met",
        evidence: "Shipped a paid support copilot pilot solo in nine days.",
      },
      {
        requirement: "Full-stack web ownership",
        status: "met",
        evidence: "Owned Next.js UI, Python services, Supabase data model, evals, and Vercel deployment.",
      },
      {
        requirement: "High-velocity, pragmatic delivery",
        status: "met",
        evidence: "Used managed services and Make workflows to reach a paid pilot in nine days.",
      },
    ],
    strengths: [
      "Multiple shipped AI workflows, not tutorial projects",
      "Strong evidence of solo ownership and speed",
      "Measures user and business outcomes",
    ],
    gaps: ["Limited evidence of native mobile delivery"],
    risks: [
      {
        risk: "Most examples are B2B workflow products",
        severity: "low",
        evidence: "No consumer-scale product is described.",
      },
    ],
    interviewQuestions: [
      {
        question: "Walk me through the ugliest shortcut you took to ship the nine-day pilot. What did you replace later?",
        why: "Tests pragmatic judgment and ability to manage intentional technical debt.",
      },
      {
        question: "How did you evaluate the support copilot before exposing it to paying users?",
        why: "Verifies the claimed eval and reliability depth.",
      },
      {
        question: "What would you deploy in the first two hours of this role?",
        why: "Tests whether her high-agency behavior transfers to a new context.",
      },
    ],
    fairnessNote:
      "The score uses only role-relevant evidence. Name, location, education pedigree, age, gender, and other protected characteristics were excluded from the assessment.",
    humanDecision: null,
    meta: { ...baseMeta, durationMs: 2410, inputTokens: 2948, outputTokens: 1180 },
  },
  {
    id: "demo-arman",
    fileName: "arman-rahimi-resume.pdf",
    source: "demo",
    profile: {
      displayName: "Arman Rahimi",
      currentRole: "Senior Full-Stack Engineer",
      yearsExperience: 5.8,
    },
    score: 84,
    recommendation: "match",
    confidence: "high",
    verdict: "Strong full-stack shipper with credible AI integration and a small product-ownership gap.",
    summary:
      "Arman offers excellent web engineering and deployment depth with several production AI integrations. He has shipped quickly and independently, but the resume shows less evidence of owning product discovery and go-to-market feedback loops than the top candidate.",
    rubric: rubric(
      [26, 17, 16, 13, 8, 4],
      [
        "Strong Next.js, Node, Python, PostgreSQL, OpenAI, and Vercel experience.",
        "Relevant full-stack experience with two recent AI-enabled products.",
        "Improved onboarding completion by 27% and reduced release time from days to hours.",
        "Led architecture and deployment for a three-person team and shipped solo side products.",
        "Comfortable with ambiguous technical briefs; product-discovery ownership is less clear.",
        "Resume is concise and measurable with minor ambiguity around individual contribution.",
      ],
    ),
    mustHaves: [
      {
        requirement: "Shipped an AI product solo",
        status: "partial",
        evidence: "Built two solo SaaS products; only one has documented active users.",
      },
      {
        requirement: "Full-stack web ownership",
        status: "met",
        evidence: "Owned React/Next.js, Node services, Postgres, CI, and Vercel releases.",
      },
      {
        requirement: "High-velocity, pragmatic delivery",
        status: "met",
        evidence: "Replaced a custom queue plan with managed workflows to launch in one week.",
      },
    ],
    strengths: [
      "Deep production web and deployment capability",
      "Good quantified delivery outcomes",
      "Uses managed infrastructure pragmatically",
    ],
    gaps: ["Limited proof of customer discovery and UI product judgment"],
    risks: [
      {
        risk: "Some ownership claims were shared with a small team",
        severity: "medium",
        evidence: "The resume says 'led' but does not separate his implementation from the team's.",
      },
    ],
    interviewQuestions: [
      {
        question: "Show me a product decision you made without a requirements document.",
        why: "Tests autonomous product judgment, the main remaining uncertainty.",
      },
      {
        question: "Which part of your AI onboarding flow failed first in production?",
        why: "Tests operational depth and candor.",
      },
      {
        question: "When would you choose Make over a custom Node worker?",
        why: "Tests stack-neutral pragmatism.",
      },
    ],
    fairnessNote:
      "The score uses only role-relevant evidence. Identity and protected characteristics were not used.",
    humanDecision: null,
    meta: { ...baseMeta, durationMs: 2190, inputTokens: 2602, outputTokens: 1044 },
  },
  {
    id: "demo-sofia",
    fileName: "sofia-marin-resume.pdf",
    source: "demo",
    profile: {
      displayName: "Sofia Marin",
      currentRole: "Automation & AI Engineer",
      yearsExperience: 3.2,
    },
    score: 71,
    recommendation: "review",
    confidence: "medium",
    verdict: "Excellent automation instincts; needs validation on full-stack product depth.",
    summary:
      "Sofia is a fast automation builder with strong Python, LLM, Zapier, and Make experience. She has delivered meaningful internal tools, but the resume provides only limited evidence of owning polished customer-facing web products and production frontend architecture.",
    rubric: rubric(
      [22, 14, 13, 12, 7, 3],
      [
        "Strong Python, OpenAI, Make, Zapier, and API integration; frontend depth is lighter.",
        "Three years in automation with several relevant LLM workflows.",
        "Cut manual operations work by 46 hours per month across four workflows.",
        "Independently discovered and shipped multiple internal automations.",
        "Thrives on loose briefs but has less evidence of public product responsibility.",
        "Clear outcomes, though technical scope is sometimes summarized too broadly.",
      ],
    ),
    mustHaves: [
      {
        requirement: "Shipped an AI product solo",
        status: "partial",
        evidence: "Shipped internal AI tools; no external product launch is documented.",
      },
      {
        requirement: "Full-stack web ownership",
        status: "unclear",
        evidence: "Lists React and Supabase but provides little architecture or UI delivery evidence.",
      },
      {
        requirement: "High-velocity, pragmatic delivery",
        status: "met",
        evidence: "Most workflows shipped in two to five days using the simplest viable platform.",
      },
    ],
    strengths: [
      "Very strong automation and API glue work",
      "Clear high-velocity examples",
      "Meaningful operational time savings",
    ],
    gaps: [
      "Customer-facing frontend ownership is not demonstrated",
      "Deployment and production monitoring depth is unclear",
    ],
    risks: [
      {
        risk: "May be stronger as an automation specialist than a full-stack product owner",
        severity: "medium",
        evidence: "Most described work is internal workflow automation.",
      },
    ],
    interviewQuestions: [
      {
        question: "Build and deploy a small customer-facing interface around one of your workflows. What do you choose and why?",
        why: "Directly tests the largest evidence gap.",
      },
      {
        question: "Describe how you monitor a Make workflow that a business depends on.",
        why: "Checks production reliability thinking.",
      },
      {
        question: "Which automation should never have been built in no-code?",
        why: "Tests architectural boundaries and judgment.",
      },
    ],
    fairnessNote:
      "The assessment uses only the evidence related to job outcomes and required capabilities.",
    humanDecision: null,
    meta: { ...baseMeta, durationMs: 1980, inputTokens: 2280, outputTokens: 990 },
  },
  {
    id: "demo-reza",
    fileName: "reza-karimi-resume.pdf",
    source: "demo",
    profile: {
      displayName: "Reza Karimi",
      currentRole: "Frontend Developer",
      yearsExperience: 2.4,
    },
    score: 54,
    recommendation: "low_match",
    confidence: "medium",
    verdict: "Promising frontend foundation, but the required AI and end-to-end ownership proof is missing.",
    summary:
      "Reza has a credible React foundation and several clean UI projects. The current resume does not yet demonstrate production LLM work, backend architecture, independent deployment ownership, or measurable product outcomes at the level this role requires.",
    rubric: rubric(
      [18, 11, 8, 8, 6, 3],
      [
        "Strong React and TypeScript; limited backend, AI orchestration, and automation evidence.",
        "Two years of frontend delivery with little directly relevant full-stack AI scope.",
        "Mentions performance improvements but gives no user or business outcome baseline.",
        "Owned UI features but not an end-to-end product or production system.",
        "Shows learning speed and side projects, but autonomy under ambiguous product briefs is unproven.",
        "The resume is readable but several claims lack scope and measurements.",
      ],
    ),
    mustHaves: [
      {
        requirement: "Shipped an AI product solo",
        status: "missing",
        evidence: "No shipped AI product is described.",
      },
      {
        requirement: "Full-stack web ownership",
        status: "partial",
        evidence: "Frontend delivery is strong; backend ownership is not demonstrated.",
      },
      {
        requirement: "High-velocity, pragmatic delivery",
        status: "unclear",
        evidence: "Project timelines and independent shipping evidence are absent.",
      },
    ],
    strengths: [
      "Solid React and TypeScript fundamentals",
      "Good visual implementation quality",
      "Shows self-directed learning",
    ],
    gaps: [
      "No production LLM or agentic-system evidence",
      "Backend, data, and deployment ownership are missing",
      "Product outcomes are not quantified",
    ],
    risks: [
      {
        risk: "The role may currently require too large a jump in autonomous scope",
        severity: "high",
        evidence: "No end-to-end product ownership example is provided.",
      },
    ],
    interviewQuestions: [
      {
        question: "Which project best proves you can own more than the frontend?",
        why: "Offers a chance to surface missing evidence.",
      },
      {
        question: "How would you build a production resume screener in one weekend?",
        why: "Tests architecture, AI awareness, and pragmatic sequencing.",
      },
      {
        question: "What have you deployed that real users rely on?",
        why: "Clarifies production responsibility.",
      },
    ],
    fairnessNote:
      "The recommendation reflects missing role evidence only and does not use personal or protected information.",
    humanDecision: null,
    meta: { ...baseMeta, durationMs: 1760, inputTokens: 2108, outputTokens: 910 },
  },
];

