import { LLMService, ExtractSlotsInput, ExtractSlotsOutput, GenerateRiskRegisterInput, GenerateRiskRegisterOutput } from "./llmInterface"
import { SLOT_DEFINITIONS, SlotId, isSlotMissing, Slot } from "../slots"

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

const MOCK_SLOT_VALUES: Record<SlotId, string | null> = {
  stakeholders: "Students enrolled at the university",
  provenance: "not specified",
  setting: "University campus, UK",
  automation: "not specified",
  consequences: "not specified",
  feedback_loops: "Unknown",
}

export const mockLLM: LLMService = {
  async extractSlots(_input: ExtractSlotsInput): Promise<ExtractSlotsOutput> {
    await delay(800)
    const slots: Slot[] = (Object.keys(SLOT_DEFINITIONS) as SlotId[]).map((id) => {
      const value = MOCK_SLOT_VALUES[id]
      return { id, label: SLOT_DEFINITIONS[id].label, value, missing: isSlotMissing(value) }
    })
    return { slots }
  },

  async generateRiskRegister(input: GenerateRiskRegisterInput): Promise<GenerateRiskRegisterOutput> {
    await delay(800)
    const hasAnswers = Object.keys(input.clarificationAnswers ?? {}).length > 0
    return {
      register: {
        projectTitle: "MindAlert Student Wellbeing System",
        generatedAt: new Date().toISOString(),
        mode: input.mode,
        slots: input.slots,
        risks: [
          {
            category: "privacy",
            description: `The system combines health, academic, and social media data without ${hasAnswers ? "verified" : "any documented"} consent, creating serious re-identification risk.`,
            affectedStakeholders: ["Students", "University admin"],
            severity: "critical",
            likelihood: "likely",
            mitigations: ["Obtain explicit, granular consent per data source", "Apply data minimisation — collect only fields required for the model"],
          },
          {
            category: "transparency",
            description: "Students are not informed that they are being monitored and risk-scored.",
            affectedStakeholders: ["Students", "Counsellors"],
            severity: "high",
            likelihood: "almost_certain",
            mitigations: ["Mandate a disclosure notice shown to students at enrolment", "Display a dashboard where students can view their own risk score"],
          },
          {
            category: "accountability",
            description: "No human-in-the-loop is described before interventions are triggered.",
            affectedStakeholders: ["Students", "University staff", "Counsellors"],
            severity: "high",
            likelihood: "possible",
            mitigations: ["Require counsellor sign-off before any intervention", "Log every automated decision with a reason for audit purposes"],
          },
          {
            category: "fairness",
            description: "Predictive models trained on historical data may encode biases against under-represented student groups.",
            affectedStakeholders: ["Students", "University admin"],
            severity: "high",
            likelihood: "likely",
            mitigations: ["Run fairness audits disaggregated by demographic group", "Include fairness metrics in model selection criteria"],
          },
        ],
        prioritisedActions: [
          "Halt data collection until explicit per-source consent is in place",
          "Add mandatory human counsellor review before any intervention is triggered",
          "Deploy a student-facing disclosure notice and risk-score dashboard",
          "Commission an independent fairness audit before system launch",
        ],
      },
    }
  },
}