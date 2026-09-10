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
  CLARIFY_FIRST_QUESTIONS,
} from "../slots"

import {
  buildSlotExtractionPrompt,
  buildOneShotBaselinePrompt,
  buildUnguidedChatPrompt,
  buildUnguidedRiskRegisterPrompt,
  buildClarifyFirstRiskRegisterPrompt,
} from "../prompts"


/**
 * =========================================================
 * HUGGING FACE CONFIGURATION
 * =========================================================
 *
 * SAME MODEL / SETTINGS FOR ALL CONDITIONS
 *
 * 1. Hidden one-shot baseline
 * 2. Unguided condition
 * 3. Clarify-first condition
 */

const HF_TOKEN =
  process.env.HF_TOKEN

const HF_MODEL =
  process.env.HF_MODEL ||
  "openai/gpt-oss-20b"

const HF_URL =
  "https://router.huggingface.co/v1/chat/completions"

/**
 * These settings are fixed across all study modes.
 */
const TEMPERATURE = 0

const MAX_TOKENS = 2000


/**
 * =========================================================
 * HUGGING FACE API CALL
 * =========================================================
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

  const finalPrompt =
    jsonMode
      ? `${prompt}

FINAL OUTPUT REQUIREMENT:
Return ONLY the JSON object.
Do not use Markdown.
Do not use code fences.
Do not write reasoning.
Do not write an explanation.
Do not write anything before or after the JSON object.`
      : prompt

  const requestBody = {
    model: HF_MODEL,

    messages: [
      {
        role: "system",
        content:
          "You are an expert responsible-AI ethics advisor. Follow the requested output format exactly. Do not invent information.",
      },
      {
        role: "user",
        content: finalPrompt,
      },
    ],

    /**
     * SAME SETTINGS FOR EVERY STUDY CONDITION.
     */
    temperature: TEMPERATURE,

    max_tokens: MAX_TOKENS,
  }

  /**
   * IMPORTANT:
   *
   * We intentionally do NOT use:
   *
   * response_format: { type: "json_object" }
   *
   * because the Hugging Face provider previously rejected
   * the request with a 400 JSON-generation error.
   */

  const response =
    await fetch(
      HF_URL,
      {
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
      }
    )

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
      JSON.stringify(data)
    )

    throw new Error(
      "Hugging Face returned an empty response."
    )
  }

  console.log(
    "Hugging Face model:",
    HF_MODEL
  )

  console.log(
    "Hugging Face response length:",
    content.length
  )

  return content.trim()
}


/**
 * =========================================================
 * JSON CLEANING
 * =========================================================
 */

function cleanJson(
  text: string
): string {

  let cleaned =
    text.trim()

  /**
   * Remove <think>...</think> blocks if the model/provider
   * returns reasoning in that format.
   */
  cleaned =
    cleaned.replace(
      /<think>[\s\S]*?<\/think>/gi,
      ""
    )

  cleaned =
    cleaned.trim()

  /**
   * Remove Markdown code fences.
   */
  cleaned =
    cleaned.replace(
      /^```(?:json)?\s*/i,
      ""
    )

  cleaned =
    cleaned.replace(
      /\s*```$/i,
      ""
    )

  return cleaned.trim()
}


/**
 * =========================================================
 * JSON OBJECT EXTRACTION
 * =========================================================
 */

function extractJsonObject(
  text: string
): string {

  const cleaned =
    cleanJson(text)

  const firstBrace =
    cleaned.indexOf("{")

  if (
    firstBrace === -1
  ) {

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

      if (
        depth === 0
      ) {

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
 * =========================================================
 * GENERIC JSON PARSER
 * =========================================================
 */

function parseJsonResponse<T>(
  rawResponse: string,
  errorMessage: string
): T {

  try {

    const cleaned =
      cleanJson(
        rawResponse
      )

    /**
     * First try the entire cleaned response.
     *
     * This handles the ideal case where the model returns
     * pure JSON.
     */
    try {

      return JSON.parse(
        cleaned
      ) as T

    } catch {
      /**
       * If extra text exists, extract the first complete
       * JSON object.
       */
    }

    const jsonText =
      extractJsonObject(
        cleaned
      )

    return JSON.parse(
      jsonText
    ) as T

  } catch (error) {

    console.error(
      "========================================"
    )

    console.error(
      errorMessage
    )

    console.error(
      "Parser error:",
      error
    )

    console.error(
      "RAW LLM RESPONSE:"
    )

    console.error(
      rawResponse
    )

    console.error(
      "========================================"
    )

    throw new Error(
      errorMessage
    )
  }
}


/**
 * =========================================================
 * RISK REGISTER VALIDATION
 * =========================================================
 */

function normaliseRiskRegister(
  parsed: Partial<RiskRegister>,
  mode: RiskRegister["mode"],
  slots: Slot[] = []
): RiskRegister {

  const risks =
    Array.isArray(
      parsed.risks
    )
      ? parsed.risks
          .filter(
            (risk) =>
              risk &&
              typeof risk ===
                "object"
          )
          .map(
            (risk) => {

              const candidate =
                risk as Record<
                  string,
                  unknown
                >

              const category =
                typeof candidate.category ===
                  "string"
                  ? candidate.category.toLowerCase()
                  : "accountability"

              const severity =
                typeof candidate.severity ===
                  "string"
                  ? candidate.severity.toLowerCase()
                  : "medium"

              const likelihood =
                typeof candidate.likelihood ===
                  "string"
                  ? candidate.likelihood.toLowerCase()
                  : "medium"

              const affectedStakeholders =
                Array.isArray(
                  candidate.affectedStakeholders
                )
                  ? candidate.affectedStakeholders
                      .filter(
                        (item) =>
                          typeof item ===
                          "string"
                      )
                  : []

              const mitigations =
                Array.isArray(
                  candidate.mitigations
                )
                  ? candidate.mitigations
                      .filter(
                        (item) =>
                          typeof item ===
                          "string"
                      )
                  : []

              return {
                ...candidate,

                category,

                description:
                  typeof candidate.description ===
                    "string"
                    ? candidate.description
                    : "Ethical risk identified in the project.",

                affectedStakeholders,

                severity,

                likelihood,

                mitigations,
              }
            }
          )
      : []

  const prioritisedActions =
    Array.isArray(
      parsed.prioritisedActions
    )
      ? parsed.prioritisedActions
          .filter(
            (item) =>
              typeof item ===
              "string"
          )
      : []

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

    mode,

    slots,

    risks,

    prioritisedActions,
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
    ).map(
      (id) => {

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
            SLOT_DEFINITIONS[
              id
            ].label,

          value,

          missing:
            isSlotMissing(
              value
            ),
        }
      }
    )

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
   * HIDDEN ONE-SHOT BASELINE
   * -------------------------------------------------------
   */

  if (
    input.mode ===
    "one_shot"
  ) {

    prompt =
      buildOneShotBaselinePrompt(
        input.brief
      )
  }

  /**
   * -------------------------------------------------------
   * CLARIFY-FIRST
   * -------------------------------------------------------
   */

  else if (
    input.mode ===
    "clarify_first"
  ) {

    const answers =
      input.clarificationAnswers ??
      {}

    const questions =
      CLARIFY_FIRST_QUESTIONS.map(
        (item) => ({
          id:
            item.slotId,

          question:
            item.question,
        })
      )

    prompt =
      buildClarifyFirstRiskRegisterPrompt(
        input.brief,

        questions,

        answers
      )
  }

  else {

    throw new Error(
      `Unsupported risk register mode: ${input.mode}`
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

  const register =
    normaliseRiskRegister(
      parsed,
      input.mode,
      input.slots ?? []
    )

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

  return normaliseRiskRegister(
    parsed,
    "unguided",
    []
  )
}