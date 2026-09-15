import { mockLLM } from "./mockLLM"
import * as huggingFaceLLM from "./huggingFaceLLM"

import {
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
  ConversationMessage,
  LLMService,
} from "./llmInterface"


const LLM_BACKEND =
  process.env.LLM_BACKEND ??
  "mock"


/**
 * =========================================================
 * NORMALISATION HELPERS
 * =========================================================
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
 * The Hugging Face backend already returns:
 *
 * {
 *   register: {...}
 * }
 *
 * The mock backend may return the register directly.
 *
 * This helper supports both formats.
 */
const normalizeRegister = (
  result: any,
  requestedMode:
    GenerateRiskRegisterInput["mode"]
): GenerateRiskRegisterOutput => {

  /**
   * Hugging Face format:
   *
   * {
   *   register: {
   *     ...
   *   }
   * }
   */
  if (
    result?.register
  ) {

    return {
      register: {
        ...result.register,

        mode:
          result.register.mode ??
          requestedMode,
      },
    }
  }


  /**
   * Direct register format.
   */
  if (
    result?.projectTitle
  ) {

    return {
      register: {
        ...result,

        mode:
          result.mode ??
          requestedMode,
      },
    }
  }


  /**
   * Last-resort empty register.
   */
  return {
    register: {

      projectTitle:
        "MindAlert Ethical Risk Analysis",

      generatedAt:
        new Date().toISOString(),

      mode:
        requestedMode,

      slots: [],

      risks: [],

      prioritisedActions: [],
    },
  }
}


/**
 * =========================================================
 * LLM SERVICE
 * =========================================================
 */

export const llmService: LLMService = {

  /**
   * -------------------------------------------------------
   * EXTRACT SLOTS
   * -------------------------------------------------------
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

      return huggingFaceLLM.extractSlots(
        input
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
   * -------------------------------------------------------
   * GENERATE RISK REGISTER
   * -------------------------------------------------------
   */

  async generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput> {

    console.log(
      `[LLM] generateRiskRegister backend=${LLM_BACKEND} mode=${input.mode}`
    )


    if (
      LLM_BACKEND ===
      "huggingface"
    ) {

      return huggingFaceLLM.generateRiskRegister(
        input
      )
    }


    if (
      LLM_BACKEND ===
      "mock"
    ) {

      const result =
        await mockLLM.generateRiskRegister(
          input
        )

      return normalizeRegister(
        result,
        input.mode
      )
    }


    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },


  /**
   * -------------------------------------------------------
   * GENERATE CHAT RESPONSE
   * -------------------------------------------------------
   */

  async generateChatResponse(
    brief: string,
    conversation: ConversationMessage[]
  ): Promise<string> {

    console.log(
      `[LLM] generateChatResponse backend=${LLM_BACKEND}`
    )


    if (
      LLM_BACKEND ===
      "huggingface"
    ) {

      return huggingFaceLLM.generateChatResponse(
        brief,
        conversation
      )
    }


    if (
      LLM_BACKEND ===
      "mock"
    ) {

      return (
        "The mock LLM backend does not support conversational responses."
      )
    }


    throw new Error(
      `Unknown LLM_BACKEND: ${LLM_BACKEND}`
    )
  },
}