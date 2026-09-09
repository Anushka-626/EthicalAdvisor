import {
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
} from "./llmInterface"

import {
  SLOT_DEFINITIONS,
  SlotId,
  Slot,
  RiskRegister,
  isSlotMissing,
} from "../slots"

import {
  buildSlotExtractionPrompt,
  buildOneShotBaselinePrompt,
  buildUnguidedChatPrompt,
  buildUnguidedRiskRegisterPrompt,
  buildClarifyFirstRiskRegisterPrompt,
} from "../prompts"

const HF_TOKEN =
  process.env.HF_TOKEN

const HF_MODEL =
  process.env.HF_MODEL ||
  "openai/gpt-oss-20b"

const HF_URL =
  "https://router.huggingface.co/v1/chat/completions"

/**
 * Calls the Hugging Face OpenAI-compatible API.
 *
 * jsonMode = true is used whenever the expected
 * response is structured JSON.
 */
async function callHuggingFace(
  prompt: string,
  jsonMode = false
): Promise<string> {
  if (!HF_TOKEN) {
    throw new Error(
      "HF_TOKEN is missing. Please add HF_TOKEN to your environment variables."
    )
  }

  const requestBody: Record<
    string,
    unknown
  > = {
    model: HF_MODEL,

    messages: [
      {
        role: "system",
        content:
          "You are an expert responsible-AI ethics advisor. Follow the requested output format exactly. Do not invent information.",
      },

      {
        role: "user",
        content: prompt,
      },
    ],

    temperature: 0,

    max_tokens: 2000,
  }

  /**
   * Ask the model to return a JSON object
   * for structured outputs.
   */
  if (jsonMode) {
    requestBody.response_format = {
      type: "json_object",
    }
  }

  const response =
    await fetch(HF_URL, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${HF_TOKEN}`,
      },

      body:
        JSON.stringify(
          requestBody
        ),
    })

  if (!response.ok) {
    let errorMessage = ""

    try {
      const errorData =
        await response.json()

      errorMessage =
        errorData?.error
          ?.message ||
        errorData?.error ||
        JSON.stringify(
          errorData
        )
    } catch {
      errorMessage =
        await response.text()
    }

    console.error(
      "Hugging Face API error:",
      response.status,
      errorMessage
    )

    throw new Error(
      `Hugging Face API error (${response.status}): ${errorMessage}`
    )
  }

  const data =
    await response.json()

  const content =
    data?.choices?.[0]
      ?.message?.content

  if (
    !content ||
    typeof content !==
      "string"
  ) {
    console.error(
      "Unexpected Hugging Face response:",
      data
    )

    throw new Error(
      "Hugging Face returned an empty response."
    )
  }

  return content.trim()
}

/**
 * Removes Markdown JSON code fences.
 */
function cleanJson(
  text: string
): string {
  let cleaned =
    text.trim()

  if (
    cleaned.startsWith(
      "```json"
    )
  ) {
    cleaned =
      cleaned.substring(7)
  } else if (
    cleaned.startsWith("```")
  ) {
    cleaned =
      cleaned.substring(3)
  }

  if (
    cleaned.endsWith("```")
  ) {
    cleaned =
      cleaned.substring(
        0,
        cleaned.length - 3
      )
  }

  return cleaned.trim()
}

/**
 * Extract the first complete JSON object.
 *
 * Handles nested objects and braces inside
 * quoted strings.
 */
function extractJsonObject(
  text: string
): string {
  const cleaned =
    cleanJson(text)

  const firstBrace =
    cleaned.indexOf("{")

  if (firstBrace === -1) {
    throw new Error(
      "No JSON object found in the LLM response."
    )
  }

  let depth = 0

  let inString = false

  let escaped = false

  for (
    let i = firstBrace;
    i < cleaned.length;
    i++
  ) {
    const character =
      cleaned[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (
      character === "\\" &&
      inString
    ) {
      escaped = true
      continue
    }

    if (
      character === '"'
    ) {
      inString =
        !inString

      continue
    }

    if (inString) {
      continue
    }

    if (
      character === "{"
    ) {
      depth++
    }

    if (
      character === "}"
    ) {
      depth--

      if (depth === 0) {
        return cleaned.substring(
          firstBrace,
          i + 1
        )
      }
    }
  }

  throw new Error(
    "The LLM response contained incomplete JSON."
  )
}

/**
 * Generic JSON parser.
 */
function parseJsonResponse<T>(
  rawResponse: string,
  errorMessage: string
): T {
  try {
    const jsonText =
      extractJsonObject(
        rawResponse
      )

    return JSON.parse(
      jsonText
    ) as T
  } catch (error) {
    console.error(
      errorMessage,
      error
    )

    console.error(
      "Raw LLM response:",
      rawResponse
    )

    throw new Error(
      errorMessage
    )
  }
}

/**
 * =========================================================
 * SLOT EXTRACTION
 * =========================================================
 */

export async function extractSlots(
  input: ExtractSlotsInput
): Promise<ExtractSlotsOutput> {
  const prompt =
    buildSlotExtractionPrompt(
      input.brief
    )

  const rawResponse =
    await callHuggingFace(
      prompt,
      true
    )

  const parsed =
    parseJsonResponse<
      Record<string, unknown>
    >(
      rawResponse,

      "The LLM returned invalid JSON while extracting contextual information."
    )

  const slots: Slot[] =
    (
      Object.keys(
        SLOT_DEFINITIONS
      ) as SlotId[]
    ).map((id) => {
      const rawValue =
        parsed[id]

      const value =
        typeof rawValue ===
          "string" &&
        rawValue.trim() !== ""
          ? rawValue.trim()
          : "not specified"

      return {
        id,

        label:
          SLOT_DEFINITIONS[id]
            .label,

        value,

        missing:
          isSlotMissing(
            value
          ),
      }
    })

  return {
    slots,
  }
}

/**
 * =========================================================
 * RISK REGISTER GENERATION
 * =========================================================
 */

export async function generateRiskRegister(
  input: GenerateRiskRegisterInput
): Promise<GenerateRiskRegisterOutput> {
  let prompt: string

  /**
   * -------------------------------------------------------
   * CONDITION A — ONE SHOT
   * -------------------------------------------------------
   *
   * Fixed MindAlert brief
   * +
   * same LLM
   * ->
   * immediate risk register
   *
   * No participant clarification answers.
   */

  if (
    input.mode ===
    "one_shot"
  ) {
    prompt =
      buildOneShotBaselinePrompt(
        input.brief
      )
  } else {
    /**
     * -----------------------------------------------------
     * CONDITION B — CLARIFY FIRST
     * -----------------------------------------------------
     *
     * Fixed MindAlert brief
     * +
     * participant answers to the same 3 questions
     * ->
     * final risk register
     */

    const answers =
      input.clarificationAnswers ??
      {}

    /**
     * The IDs correspond to:
     *
     * provenance
     * automation
     * consequences
     *
     * The actual fixed question text is already
     * controlled by the frontend/backend.
     */
    const questions =
      Object.keys(answers).map(
        (id) => ({
          id,

          question: id,
        })
      )

    prompt =
      buildClarifyFirstRiskRegisterPrompt(
        input.brief,

        questions,

        answers
      )
  }

  const rawResponse =
    await callHuggingFace(
      prompt,
      true
    )

  const parsed =
    parseJsonResponse<
      Partial<RiskRegister>
    >(
      rawResponse,

      "The LLM returned invalid JSON while generating the ethical risk register."
    )

  const register:
    RiskRegister = {
    projectTitle:
      typeof parsed.projectTitle ===
      "string"
        ? parsed.projectTitle
        : "MindAlert Ethical Risk Analysis",

    generatedAt:
      typeof parsed.generatedAt ===
      "string"
        ? parsed.generatedAt
        : new Date().toISOString(),

    mode:
      input.mode,

    slots:
      input.slots,

    risks:
      Array.isArray(
        parsed.risks
      )
        ? parsed.risks
        : [],

    prioritisedActions:
      Array.isArray(
        parsed.prioritisedActions
      )
        ? parsed.prioritisedActions
        : [],
  }

  return {
    register,
  }
}

/**
 * =========================================================
 * UNGUIDED CHAT
 * =========================================================
 */

export async function generateChatResponse(
  brief: string,

  conversation: Array<{
    role:
      | "user"
      | "assistant"

    content: string
  }>
): Promise<string> {
  const prompt =
    buildUnguidedChatPrompt(
      brief,
      conversation
    )

  return callHuggingFace(
    prompt,
    false
  )
}

/**
 * =========================================================
 * UNGUIDED FINAL RISK REGISTER
 * =========================================================
 */

export async function generateUnguidedRiskRegister(
  brief: string,

  conversation: Array<{
    role:
      | "user"
      | "assistant"

    content: string
  }>
): Promise<RiskRegister> {
  const prompt =
    buildUnguidedRiskRegisterPrompt(
      brief,
      conversation
    )

  const rawResponse =
    await callHuggingFace(
      prompt,
      true
    )

  const parsed =
    parseJsonResponse<
      Partial<RiskRegister>
    >(
      rawResponse,

      "The LLM returned invalid JSON while generating the unguided risk register."
    )

  return {
    projectTitle:
      typeof parsed.projectTitle ===
      "string"
        ? parsed.projectTitle
        : "MindAlert Ethical Risk Analysis",

    generatedAt:
      typeof parsed.generatedAt ===
      "string"
        ? parsed.generatedAt
        : new Date().toISOString(),

    mode: "unguided",

    slots: [],

    risks:
      Array.isArray(
        parsed.risks
      )
        ? parsed.risks
        : [],

    prioritisedActions:
      Array.isArray(
        parsed.prioritisedActions
      )
        ? parsed.prioritisedActions
        : [],
  }
}