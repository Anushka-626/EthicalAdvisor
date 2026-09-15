import {
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
  ConversationMessage,
} from "./llmInterface"

import {
  SLOT_DEFINITIONS,
  SlotId,
  Slot,
  RiskRegister,
  RiskItem,
  RiskCategory,
  isSlotMissing,
} from "../slots"

import {
  buildSlotExtractionPrompt,
  buildUnguidedChatPrompt,
} from "../prompts"

/**
 * =========================================================
 * HUGGING FACE CONFIGURATION
 * =========================================================
 *
 * SAME MODEL / SETTINGS FOR ALL STUDY CONDITIONS
 *
 * - One-shot baseline
 * - Unguided AI Analysis
 * - Clarify-first AI Analysis
 */

const HF_TOKEN = process.env.HF_TOKEN

const HF_MODEL =
  process.env.HF_MODEL ||
  "openai/gpt-oss-20b"

const HF_URL =
  "https://router.huggingface.co/v1/chat/completions"

/**
 * Temperature must remain identical across all
 * experimental conditions.
 */
const TEMPERATURE = 0

/**
 * 2000 tokens was sometimes too small for the
 * complete ethical risk register.
 *
 * 4000 gives the model enough space to finish
 * the JSON object.
 */
const MAX_TOKENS = 4000


/**
 * =========================================================
 * HUGGING FACE API CALL
 * =========================================================
 */

async function callHuggingFace(
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>,
  requireJson = false
): Promise<string> {

  if (!HF_TOKEN) {
    throw new Error(
      "HF_TOKEN is missing. Check the server environment variables."
    )
  }

  const finalMessages = requireJson
    ? messages.map((message) => ({
        ...message,

        content:
          message.role === "user"
            ? `${message.content}

FINAL OUTPUT REQUIREMENT:

Return ONLY one complete valid JSON object.

The JSON must be complete and syntactically valid.

Do not use Markdown.
Do not use code fences.
Do not include reasoning.
Do not include explanations.
Do not include text before the JSON.
Do not include text after the JSON.

Keep descriptions and mitigation actions concise so that the complete JSON fits within the response limit.`
            : message.content,
      }))
    : messages

  const requestBody = {
    model: HF_MODEL,
    messages: finalMessages,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  }

  console.log(
    "[HF] Sending request",
    {
      model: HF_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messageCount: finalMessages.length,
      requireJson,
    }
  )

  const response = await fetch(
    HF_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_TOKEN}`,
      },

      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {

    let errorMessage = ""

    try {

      const errorData =
        await response.json()

      errorMessage =
        errorData?.error?.message ||
        errorData?.error ||
        errorData?.message ||
        JSON.stringify(errorData)

    } catch {

      try {
        errorMessage =
          await response.text()
      } catch {
        errorMessage =
          "Unknown Hugging Face API error."
      }
    }

    console.error(
      "[HF] API request failed",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        model:
          HF_MODEL,

        error:
          errorMessage,
      }
    )

    throw new Error(
      `Hugging Face API error (${response.status}): ${errorMessage}`
    )
  }

  const data =
    await response.json()

  console.log(
    "[HF] Response received",
    {
      model:
        HF_MODEL,

      responseKeys:
        Object.keys(data ?? {}),

      finishReason:
        data?.choices?.[0]?.finish_reason,
    }
  )

  const content =
    data?.choices?.[0]?.message?.content

  if (
    !content ||
    typeof content !== "string"
  ) {

    console.error(
      "[HF] Unexpected response:",
      JSON.stringify(data)
    )

    throw new Error(
      "Hugging Face returned an empty or unexpected response."
    )
  }

  console.log(
    "[HF] Response length:",
    content.length
  )

  console.log(
    "[HF] Finish reason:",
    data?.choices?.[0]?.finish_reason
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
   * Remove reasoning blocks if returned by
   * the model.
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
      cleanJson(rawResponse)

    /**
     * First attempt:
     * Parse the complete response directly.
     */
    try {

      return JSON.parse(
        cleaned
      ) as T

    } catch {
      /**
       * Second attempt:
       * Extract the JSON object from any
       * surrounding text.
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
      `${errorMessage} ${
        error instanceof Error
          ? error.message
          : ""
      }`
    )
  }
}


/**
 * =========================================================
 * TYPE-SAFE RISK HELPERS
 * =========================================================
 */

function normaliseCategory(
  value: unknown
): RiskCategory {

  if (
    value === "fairness" ||
    value === "privacy" ||
    value === "transparency" ||
    value === "security" ||
    value === "accountability"
  ) {
    return value
  }

  return "accountability"
}


type RiskLevel =
  | "low"
  | "medium"
  | "high"


function normaliseRiskLevel(
  value: unknown
): RiskLevel {

  if (
    value === "low" ||
    value === "medium" ||
    value === "high"
  ) {
    return value
  }

  return "medium"
}


function normaliseStringArray(
  value: unknown
): string[] {

  if (
    !Array.isArray(value)
  ) {
    return []
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  )
}


/**
 * =========================================================
 * RISK REGISTER NORMALISATION
 * =========================================================
 */

function normaliseRiskRegister(
  parsed: Partial<RiskRegister>,
  mode: RiskRegister["mode"],
  slots: Slot[] = []
): RiskRegister {

  const risks: RiskItem[] =
    Array.isArray(
      parsed.risks
    )
      ? parsed.risks.map(
          (
            risk
          ): RiskItem => {

            return {

              category:
                normaliseCategory(
                  risk.category
                ),

              description:
                typeof risk.description ===
                  "string"
                  ? risk.description
                  : "Ethical risk identified in the project.",

              affectedStakeholders:
                normaliseStringArray(
                  risk.affectedStakeholders
                ),

              severity:
                normaliseRiskLevel(
                  risk.severity
                ),

              likelihood:
                normaliseRiskLevel(
                  risk.likelihood
                ),

              mitigations:
                normaliseStringArray(
                  risk.mitigations
                ),
            }
          }
        )
      : []

  const prioritisedActions =
    Array.isArray(
      parsed.prioritisedActions
    )
      ? parsed.prioritisedActions.filter(
          (
            item
          ): item is string =>
            typeof item === "string"
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
      [
        {
          role: "user",
          content: prompt,
        },
      ],
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
          typeof rawValue === "string" &&
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
 * FINAL RISK REGISTER PROMPT
 * =========================================================
 */

function buildFinalRiskRegisterPrompt(
  input: GenerateRiskRegisterInput
): string {

  const baseInstructions = `
You are generating the final ethical risk register for the MindAlert project.

The project brief is fixed and must be treated as the primary project description.

Identify ethical risks supported by the project description and the additional context supplied below.

Use these ethical risk categories when relevant:

- fairness
- privacy
- transparency
- security
- accountability

Do NOT force all categories to appear.

Do NOT force a fixed number of risks.

Only include risks reasonably supported by the available information.

For every risk provide:

- category
- description
- affectedStakeholders
- severity
- likelihood
- mitigations

Severity must be exactly one of:

- low
- medium
- high

Likelihood must be exactly one of:

- low
- medium
- high

affectedStakeholders must be an array of strings.

mitigations must be an array of concrete recommended actions.

prioritisedActions must contain the most important recommended actions across the identified risks.

IMPORTANT OUTPUT CONSTRAINTS:

- Keep descriptions concise.
- Keep stakeholder names concise.
- Keep mitigation actions concise.
- Avoid unnecessary explanations.
- Do not repeat the same risk.
- The complete JSON object must fit within the output limit.
- Do not include more risks than are reasonably supported by the information.
- Do not invent facts.

Do not invent facts that are not supported by the brief or supplied interaction context.

Return exactly one COMPLETE JSON object.

The JSON structure must be:

{
  "projectTitle": "MindAlert",
  "generatedAt": "ISO timestamp",
  "risks": [
    {
      "category": "privacy",
      "description": "Description of the ethical risk.",
      "affectedStakeholders": [
        "Students"
      ],
      "severity": "high",
      "likelihood": "high",
      "mitigations": [
        "Recommended mitigation."
      ]
    }
  ],
  "prioritisedActions": [
    "Most important recommended action."
  ]
}
`

  let context = ""

  /**
   * -------------------------------------------------------
   * ONE-SHOT
   * -------------------------------------------------------
   */

  if (
    input.mode === "one_shot"
  ) {

    context = `
ADDITIONAL INTERACTION CONTEXT:

There was no participant interaction.

Use only the fixed project brief.
`
  }

  /**
   * -------------------------------------------------------
   * UNGUIDED
   * -------------------------------------------------------
   */

  else if (
    input.mode === "unguided"
  ) {

    const conversation =
      input.conversation ?? []

    const conversationText =
      conversation.length > 0
        ? conversation
            .map(
              (
                message: ConversationMessage
              ) =>
                `${message.role.toUpperCase()}: ${message.content}`
            )
            .join("\n\n")
        : "No conversation was recorded."

    context = `
ADDITIONAL INTERACTION CONTEXT:

The participant explored the project through an unguided conversation with a general AI assistant.

Use the complete conversation below as additional context.

Participant statements are not automatically facts about the existing project. Treat them as decisions, assumptions, questions, or considerations that may inform the ethical analysis.

--- BEGIN CONVERSATION ---

${conversationText}

--- END CONVERSATION ---
`
  }

  /**
   * -------------------------------------------------------
   * CLARIFY-FIRST
   * -------------------------------------------------------
   */

  else if (
    input.mode === "clarify_first"
  ) {

    const answers =
      input.clarificationAnswers ?? {}

    context = `
ADDITIONAL INTERACTION CONTEXT:

The participant answered three predefined clarification questions.

Use these answers as project-definition decisions made by the participant.

--- CLARIFICATION ANSWERS ---

Question 1:
What consent or opt-out process, if any, will MindAlert use before collecting and using students' personal data?

Answer:
${answers.q1 ?? "No answer provided."}

Question 2:
Will a high-risk classification be reviewed by a human before any action is taken? If yes, who will review it?

Answer:
${answers.q2 ?? "No answer provided."}

Question 3:
If a student believes that their risk classification is incorrect, can they request a review or challenge the decision? If yes, how?

Answer:
${answers.q3 ?? "No answer provided."}

--- END CLARIFICATION ANSWERS ---
`
  }

  return `
${baseInstructions}

--- BEGIN FIXED PROJECT BRIEF ---

${input.brief}

--- END FIXED PROJECT BRIEF ---

${context}
`
}


/**
 * =========================================================
 * COMPACT RETRY PROMPT
 * =========================================================
 *
 * Used only if the first model response is incomplete
 * or invalid JSON.
 *
 * Same model and temperature are retained.
 */

function buildCompactRetryPrompt(
  input: GenerateRiskRegisterInput
): string {

  const base =
    buildFinalRiskRegisterPrompt(
      input
    )

  return `
${base}

IMPORTANT RETRY:

The previous response was incomplete or invalid JSON.

Generate the COMPLETE JSON object again.

Make the response compact.

Use concise descriptions.

Use concise stakeholder names.

Use concise mitigation actions.

Do not include unnecessary wording.

Do not include reasoning.

Do not include Markdown.

Do not include code fences.

Return ONLY the complete JSON object.

Before finishing, make sure every opening { has a matching closing } and every opening [ has a matching closing ].
`
}


/**
 * =========================================================
 * FINAL RISK REGISTER GENERATION
 * =========================================================
 */

export async function generateRiskRegister(
  input: GenerateRiskRegisterInput
): Promise<GenerateRiskRegisterOutput> {

  console.log(
    "[HF] Generating risk register",
    {
      mode:
        input.mode,

      slotCount:
        input.slots?.length ?? 0,

      hasClarificationAnswers:
        Boolean(
          input.clarificationAnswers &&
          Object.keys(
            input.clarificationAnswers
          ).length > 0
        ),

      clarificationKeys:
        Object.keys(
          input.clarificationAnswers ?? {}
        ),

      conversationLength:
        input.conversation?.length ?? 0,
    }
  )

  /**
   * -------------------------------------------------------
   * FIRST ATTEMPT
   * -------------------------------------------------------
   */

  const prompt =
    buildFinalRiskRegisterPrompt(
      input
    )

  let rawResponse = ""

  try {

    rawResponse =
      await callHuggingFace(
        [
          {
            role: "user",
            content: prompt,
          },
        ],
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

    if (
      register.risks.length === 0
    ) {

      console.warn(
        "[HF] Model returned a risk register with zero risks."
      )
    }

    return {
      register,
    }

  } catch (firstError) {

    console.error(
      "[HF] First risk-register generation attempt failed:",
      firstError
    )

    console.log(
      "[HF] Retrying once with compact JSON instructions..."
    )
  }


  /**
   * -------------------------------------------------------
   * SECOND ATTEMPT
   * -------------------------------------------------------
   *
   * This retry uses:
   *
   * - same model
   * - same temperature
   * - same MAX_TOKENS
   *
   * Only the instruction is made more explicit
   * about producing compact complete JSON.
   */

  const retryPrompt =
    buildCompactRetryPrompt(
      input
    )

  const retryResponse =
    await callHuggingFace(
      [
        {
          role: "user",
          content:
            retryPrompt,
        },
      ],
      true
    )

  const retryParsed =
    parseJsonResponse<
      Partial<RiskRegister>
    >(
      retryResponse,

      "The LLM returned invalid JSON while generating the ethical risk register after retry."
    )

  const retryRegister =
    normaliseRiskRegister(
      retryParsed,
      input.mode,
      input.slots ?? []
    )

  if (
    retryRegister.risks.length === 0
  ) {

    console.warn(
      "[HF] Retry returned a risk register with zero risks."
    )
  }

  return {
    register:
      retryRegister,
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
    [
      {
        role: "user",
        content: prompt,
      },
    ],
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

  const result =
    await generateRiskRegister({
      brief,

      mode:
        "unguided",

      slots: [],

      conversation,
    })

  return result.register
}