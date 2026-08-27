import { Slot, RiskRegister } from "../slots"

export interface ExtractSlotsInput { brief: string }
export interface ExtractSlotsOutput { slots: Slot[] }

export interface GenerateRiskRegisterInput {
  brief: string
  mode: "one_shot" | "clarify_first"
  slots: Slot[]
  clarificationAnswers?: Record<string, string>
}

export interface GenerateRiskRegisterOutput {
  register: RiskRegister
}

export interface LLMService {
  extractSlots(input: ExtractSlotsInput): Promise<ExtractSlotsOutput>
  generateRiskRegister(input: GenerateRiskRegisterInput): Promise<GenerateRiskRegisterOutput>
}