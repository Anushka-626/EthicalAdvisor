import {
  Slot,
  RiskRegister,
} from "../slots"


export interface ExtractSlotsInput {
  brief: string
}


export interface ExtractSlotsOutput {
  slots: Slot[]
}


export interface ConversationMessage {
  role:
    | "user"
    | "assistant"

  content: string

  timestamp?: string
}


export interface GenerateRiskRegisterInput {
  brief: string

  mode:
    | "one_shot"
    | "clarify_first"
    | "unguided"

  slots: Slot[]

  clarificationAnswers?: Record<
    string,
    string
  >

  conversation: ConversationMessage[]
}


export interface GenerateRiskRegisterOutput {
  register: RiskRegister
}


/**
 * =========================================================
 * LLM SERVICE INTERFACE
 * =========================================================
 *
 * Defines every operation that the application can request
 * from the configured LLM backend.
 */

export interface LLMService {

  /**
   * Extract contextual slots from the fixed project brief.
   */
  extractSlots(
    input: ExtractSlotsInput
  ): Promise<ExtractSlotsOutput>


  /**
   * Generate the final ethical risk register.
   *
   * This same method is used for:
   *
   * - one_shot
   * - clarify_first
   * - unguided
   */
  generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput>


  /**
   * Generate one response during the Unguided AI Analysis
   * conversation.
   */
  generateChatResponse(
    brief: string,
    conversation: ConversationMessage[]
  ): Promise<string>
}