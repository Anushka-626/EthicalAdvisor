import {
  Slot,
  RiskRegister,
  SlotId,
} from "../slots"

export interface ExtractSlotsInput {
  brief: string
}

export interface ExtractSlotsOutput {
  slots: Slot[]
}

export interface GenerateRiskRegisterInput {
  brief: string

  mode: "one_shot" | "clarify_first"

  /**
   * Used by the clarify-first condition.
   *
   * Optional because the one-shot condition must
   * analyse the brief directly without a separate
   * slot-extraction LLM call.
   */
  slots?: Slot[]

  clarificationAnswers?: Record<string, string>
}

export interface GenerateRiskRegisterOutput {
  register: RiskRegister
}

export interface LLMService {
  extractSlots(
    input: ExtractSlotsInput
  ): Promise<ExtractSlotsOutput>

  generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput>
}