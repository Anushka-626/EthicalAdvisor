export type SlotId = "stakeholders" | "provenance" | "setting" | "automation" | "consequences" | "feedback_loops"
export type RiskCategory = "fairness" | "privacy" | "transparency" | "security" | "accountability"
export type Severity = "low" | "medium" | "high" | "critical"
export type Likelihood = "unlikely" | "possible" | "likely" | "almost_certain"

export interface Slot {
  id: SlotId
  label: string
  value: string | null
  missing: boolean
}

export interface ClarificationQuestion {
  slotId: SlotId
  question: string
}

export interface RiskItem {
  category: RiskCategory
  description: string
  affectedStakeholders: string[]
  severity: Severity
  likelihood: Likelihood
  mitigations: string[]
}

export interface RiskRegister {
  projectTitle: string
  generatedAt: string
  mode: "one_shot" | "clarify_first"
  slots: Slot[]
  risks: RiskItem[]
  prioritisedActions: string[]
}

export const SLOT_DEFINITIONS: Record<SlotId, { label: string; description: string }> = {
  stakeholders: { label: "Stakeholders", description: "Who is directly or indirectly impacted by the system outputs or decisions." },
  provenance:   { label: "Data Provenance", description: "How data was collected, labelled, and whether consent was obtained." },
  setting:      { label: "Deployment Setting", description: "Operational environment, target population, and key constraints." },
  automation:   { label: "Automation Level", description: "Degree of human control versus automated decision-making." },
  consequences: { label: "Decision Consequences", description: "Reversibility and severity of decisions made by or from the system." },
  feedback_loops: { label: "Feedback Loops", description: "Whether outputs feed back into future inputs or retraining data." },
}

export const QUESTION_BANK: ClarificationQuestion[] = [
  { slotId: "stakeholders",   question: "Who will be directly impacted by the recommendations or decisions your model produces? Please include intended users as well as any third parties who may be affected." },
  { slotId: "automation",     question: "Will the model outputs be acted upon automatically, or will a human review each decision before it is implemented?" },
  { slotId: "setting",        question: "In what operational setting will this system be deployed, and what are the key constraints or sensitivities of that environment?" },
  { slotId: "provenance",     question: "How was the data collected or labelled? Was informed consent obtained from the individuals whose data is used?" },
  { slotId: "consequences",   question: "How significant and reversible are the decisions made using your model's outputs? For example, can an affected person appeal or overturn a decision?" },
  { slotId: "feedback_loops", question: "Will the model's outputs be fed back into future training data or used to trigger further automated processes?" },
]

export const HEDGING_PHRASES = [
  "it is unclear whether", "the brief does not specify", "this information is not provided",
  "further details are needed", "not specified", "not mentioned", "unclear",
  "unknown", "not provided", "no information",
]

export function isSlotMissing(value: string | null): boolean {
  if (!value || value.trim() === "") return true
  const lower = value.toLowerCase()
  return HEDGING_PHRASES.some((phrase) => lower.includes(phrase))
}

export function selectClarificationQuestions(slots: Slot[], maxQuestions = 3): ClarificationQuestion[] {
  const missingSlotIds = new Set(slots.filter((s) => s.missing).map((s) => s.id))
  return QUESTION_BANK.filter((q) => missingSlotIds.has(q.slotId)).slice(0, maxQuestions)
}