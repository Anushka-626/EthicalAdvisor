import { mockLLM } from "./mockLLM"
import * as huggingFaceLLM from "./huggingFaceLLM"

import {
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
  LLMService,
} from "./llmInterface"

const LLM_BACKEND =
  process.env.LLM_BACKEND ?? "mock"

/**
 * Normalize slot extraction responses.
 */
const normalizeSlots = (
  result: any
): ExtractSlotsOutput => {
  if (Array.isArray(result)) {
    return {
      slots: result,
    }
  }

  return (
    result ?? {
      slots: [],
    }
  )
}

/**
 * Normalize risk-register responses.
 *
 * IMPORTANT:
 * We preserve the requested experimental mode.
 * We do NOT silently convert failed results to one_shot.
 */
const normalizeRegister = (
  result: any,
  requestedMode: GenerateRiskRegisterInput["mode"]
): GenerateRiskRegisterOutput => {
  if (
    typeof result === "string" ||
    !result?.projectTitle
  ) {
    return {
      register: {
        projectTitle: "",
        generatedAt:
          new Date().toISOString(),
        mode: requestedMode,
        slots: [],
        risks: [],
        prioritisedActions: [],
      },
    }
  }

  return {
    ...result,
    register: {
      ...result.register,
      mode:
        result.register?.mode ??
        requestedMode,
    },
  }
}

export const llmService: LLMService = {
  /**
   * Extract missing contextual slots from the fixed
   * MindAlert project brief.
   *
   * Used by the clarification workflow.
   */
  async extractSlots(
    input: ExtractSlotsInput
  ): Promise<ExtractSlotsOutput> {
    console.log(
      `[LLM] extractSlots backend=${LLM_BACKEND}`
    )

    if (
      LLM_BACKEND === "huggingface"
    ) {
      return huggingFaceLLM.extractSlots(
        input
      )
    }

    if (
      LLM_BACKEND === "mock"
    ) {
      return normalizeSlots(
        await mockLLM.extractSlots(input)
      )
    }

    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },

  /**
   * Generate a structured ethical risk register.
   *
   * The same deployed LLM backend is used for:
   *
   * - hidden one-shot baseline
   * - Condition A: Unguided
   * - Condition B: Clarify-first
   */
  async generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput> {
    console.log(
      `[LLM] generateRiskRegister backend=${LLM_BACKEND} mode=${input.mode}`
    )

    if (
      LLM_BACKEND === "huggingface"
    ) {
      return huggingFaceLLM.generateRiskRegister(
        input
      )
    }

    if (
      LLM_BACKEND === "mock"
    ) {
      return normalizeRegister(
        await mockLLM.generateRiskRegister(
          input
        ),
        input.mode
      )
    }

    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },
}