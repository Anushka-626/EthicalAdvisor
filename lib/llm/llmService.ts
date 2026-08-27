import { mockLLM } from "./mockLLM"

import * as huggingFaceLLM from "./huggingFaceLLM"

import {
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
  LLMService,
} from "./llmInterface"


/**
 * Select which LLM backend to use.
 *
 * .env.local:
 *
 * LLM_BACKEND=huggingface
 *
 * or:
 *
 * LLM_BACKEND=mock
 */
const LLM_BACKEND =
  process.env.LLM_BACKEND ??
  "mock"


/**
 * Normalise mock slot output.
 */
const normalizeSlots = (
  result: any
): ExtractSlotsOutput => {

  if (
    Array.isArray(result)
  ) {

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
 * Normalise mock risk register output.
 */
const normalizeRegister = (
  result: any
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

        mode: "one_shot",

        slots: [],

        risks: [],

        prioritisedActions: [],
      },
    }
  }


  return result
}


/**
 * Main LLM service.
 *
 * The API route uses this service.
 *
 * The rest of the application does not
 * need to know which LLM is being used.
 */
export const llmService:
  LLMService = {


  /**
   * Extract contextual slots.
   */
  async extractSlots(
    input: ExtractSlotsInput
  ): Promise<ExtractSlotsOutput> {

    console.log(
      `[LLM] extractSlots backend=${LLM_BACKEND}`
    )


    if (
      LLM_BACKEND ===
      "huggingface"
    ) {

      return (
        huggingFaceLLM.extractSlots(
          input
        )
      )
    }


    if (
      LLM_BACKEND ===
      "mock"
    ) {

      return normalizeSlots(
        await mockLLM.extractSlots(
          input
        )
      )
    }


    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },


  /**
   * Generate the final ethical
   * risk register.
   */
  async generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput> {

    console.log(
      `[LLM] generateRiskRegister backend=${LLM_BACKEND}`
    )


    if (
      LLM_BACKEND ===
      "huggingface"
    ) {

      return (
        huggingFaceLLM.generateRiskRegister(
          input
        )
      )
    }


    if (
      LLM_BACKEND ===
      "mock"
    ) {

      return normalizeRegister(
        await mockLLM.generateRiskRegister(
          input
        )
      )
    }


    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },
}