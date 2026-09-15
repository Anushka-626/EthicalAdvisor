// ============================================================
// STUDY CONFIGURATION
// ============================================================

export type ConditionOrder = "A_B" | "B_A"

// ------------------------------------------------------------
// Standardised MindAlert project brief
// IMPORTANT: Keep this identical for every participant.
// ------------------------------------------------------------

export const MINDALEERT_BRIEF = `
MindAlert is an AI-based early-warning system proposed by CampusCare
Solutions for universities.

The system is designed to identify university students who may be at
risk of dropping out or experiencing difficulties with their studies.
It uses several types of student data, including grades, attendance,
assignment submission patterns, dropout-related information, university
login activity, health centre records, social media posts from Twitter/X
and Instagram using student email handles, and financial aid information.

The system produces a weekly risk prediction for each student using
three levels: Low, Medium, and High.

For students classified as high risk, the system automatically sends
a check-in email. The system also provides a dashboard for the Dean of
Students and university counselling staff.

Students are not currently informed that their data is being used by
the system or that they are being assessed by an AI risk prediction
system.

The system is planned to be retrained every month using feedback from
the system's users.

CampusCare Solutions has limited resources and does not currently have
a dedicated infrastructure, auditing, or monitoring budget. The system
must generate its weekly predictions within approximately two hours
each Monday.

Counsellors and university staff need to be able to understand why a
student has received a particular risk classification.

The project aims to achieve 80% recall for identifying students at risk
within two weeks, reduce staff workload by 30%, and deploy the system
at five universities within twelve months.
`

// ------------------------------------------------------------
// Versioning
// ------------------------------------------------------------

export const BRIEF_VERSION = "mindalert-v1.0"

// ------------------------------------------------------------
// Unguided AI condition
//
// Maximum number of participant prompts/questions.
// This limit is identical for every participant.
// ------------------------------------------------------------

export const MAX_UNGUIDED_TURNS = 10

// ------------------------------------------------------------
// Condition B – FIXED clarification questions
//
// IMPORTANT:
// These questions must be identical for every participant.
// Do NOT generate these dynamically with the LLM.
// ------------------------------------------------------------

export const FIXED_CLARIFICATION_QUESTIONS = [
  {
    id: "q1",
    question:
      "What consent or opt-out process, if any, will MindAlert use before collecting and using students' personal data?",
  },
  {
    id: "q2",
    question:
      "Will a high-risk classification be reviewed by a human before any action is taken? If yes, who will review it?",
  },
  {
    id: "q3",
    question:
      "If a student believes that their risk classification is incorrect, can they request a review or challenge the decision? If yes, how?",
  },
] as const

// ------------------------------------------------------------
// Instructions shown before the clarification questions
// ------------------------------------------------------------

export const CLARIFICATION_INSTRUCTIONS = `
Some project details are not specified in the brief. For these
questions, assume that you are helping define those missing project
details. Please make a reasonable decision based on your understanding
of the project. There are no right or wrong answers.
`

// ------------------------------------------------------------
// Counterbalancing
//
// Condition A = Unguided AI Analysis
// Condition B = Clarify-first AI Analysis
//
// We use the anonymous session ID to assign the order.
// This makes the assignment deterministic:
//   even -> A_B
//   odd  -> B_A
//
// The participant keeps the same order throughout the study.
// ------------------------------------------------------------

export function getConditionOrderFromSessionId(
  sessionId: string
): ConditionOrder {
  if (!sessionId) {
    return "A_B"
  }

  // Take the final hexadecimal character of the UUID.
  const lastCharacter = sessionId.charAt(
    sessionId.length - 1
  )

  const numericValue = parseInt(lastCharacter, 16)

  if (Number.isNaN(numericValue)) {
    return "A_B"
  }

  return numericValue % 2 === 0 ? "A_B" : "B_A"
}

// ------------------------------------------------------------
// Get or create anonymous session ID
// ------------------------------------------------------------

export function getStoredSessionId(): string {
  if (typeof window === "undefined") {
    return ""
  }

  let sessionId = localStorage.getItem("session_id")

  if (!sessionId) {
    sessionId = crypto.randomUUID()

    localStorage.setItem(
      "session_id",
      sessionId
    )
  }

  return sessionId
}

// ------------------------------------------------------------
// Get condition order
//
// If an order already exists, use it.
// Otherwise calculate it from the anonymous session ID
// and store it.
// ------------------------------------------------------------

export function getStoredConditionOrder(): ConditionOrder {
  if (typeof window === "undefined") {
    return "A_B"
  }

  const stored =
    localStorage.getItem("condition_order")

  if (
    stored === "A_B" ||
    stored === "B_A"
  ) {
    return stored
  }

  const sessionId = getStoredSessionId()

  const newOrder =
    getConditionOrderFromSessionId(sessionId)

  localStorage.setItem(
    "condition_order",
    newOrder
  )

  return newOrder
}

// ------------------------------------------------------------
// Convenience helper
//
// Returns which condition should be shown first.
// ------------------------------------------------------------

export function getFirstCondition(
  conditionOrder: ConditionOrder
): "A" | "B" {
  return conditionOrder === "A_B"
    ? "A"
    : "B"
}

// ------------------------------------------------------------
// Convenience helper
//
// Returns which condition should be shown second.
// ------------------------------------------------------------

export function getSecondCondition(
  conditionOrder: ConditionOrder
): "A" | "B" {
  return conditionOrder === "A_B"
    ? "B"
    : "A"
}