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
// Unguided LLM condition
//
// This is deliberately reasonably large so participants have
// enough opportunity to explore the ethical issues.
// The same limit applies to every participant.
// ------------------------------------------------------------

export const MAX_UNGUIDED_TURNS = 10

// ------------------------------------------------------------
// Counterbalancing
// ------------------------------------------------------------

export function getConditionOrder(): ConditionOrder {
  return Math.random() < 0.5 ? "A_B" : "B_A"
}

// ------------------------------------------------------------
// Store condition order in localStorage
// This ensures the participant keeps the same order throughout
// the entire study.
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

  const newOrder = getConditionOrder()

  localStorage.setItem(
    "condition_order",
    newOrder
  )

  return newOrder
}

// ------------------------------------------------------------
// Anonymous participant/session ID
// ------------------------------------------------------------

export function getStoredSessionId(): string {
  if (typeof window === "undefined") {
    return ""
  }

  let sessionId =
    localStorage.getItem("session_id")

  if (!sessionId) {
    sessionId = crypto.randomUUID()

    localStorage.setItem(
      "session_id",
      sessionId
    )
  }

  return sessionId
}