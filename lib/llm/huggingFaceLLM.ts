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
  buildRiskRegisterPrompt,
} from "../prompts"


const HF_TOKEN = process.env.HF_TOKEN

const HF_MODEL =
  process.env.HF_MODEL ||
  "meta-llama/Llama-3.1-8B-Instruct"

const HF_URL =
  "https://router.huggingface.co/v1/chat/completions"


/**
 * Send a prompt to Hugging Face.
 *
 * This function runs on the server through
 * /api/analyze.
 *
 * The Hugging Face token is NEVER exposed
 * to the browser.
 */
async function callHuggingFace(
  prompt: string
): Promise<string> {

  if (!HF_TOKEN) {
    throw new Error(
      "HF_TOKEN is missing. Please add HF_TOKEN to .env.local and restart the server."
    )
  }

  const response = await fetch(
    HF_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_TOKEN}`,
      },

      body: JSON.stringify({
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
      }),
    }
  )


  if (!response.ok) {

    const errorText =
      await response.text()

    console.error(
      "Hugging Face error:",
      response.status,
      errorText
    )

    let providerMessage = errorText.trim()

    try {
      const errorData = JSON.parse(errorText)
      providerMessage =
        errorData?.error?.message ||
        errorData?.error ||
        providerMessage
    } catch {
      // Keep the plain-text provider response when it is not JSON.
    }

    throw new Error(
      `Hugging Face API error: ${response.status}${
        providerMessage ? ` - ${providerMessage}` : ""
      }`
    )
  }


  const data =
    await response.json()


  const content =
    data?.choices?.[0]?.message?.content


  if (
    !content ||
    typeof content !== "string"
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
 * Remove markdown code fences if the
 * model returns JSON inside ```json ... ```
 */
function cleanJson(
  text: string
): string {

  let cleaned =
    text.trim()


  if (
    cleaned.startsWith("```json")
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
 * Extract the JSON object from the model response.
 */
function extractJsonObject(
  text: string
): string {

  const cleaned =
    cleanJson(text)


  const firstBrace =
    cleaned.indexOf("{")


  const lastBrace =
    cleaned.lastIndexOf("}")


  if (
    firstBrace === -1 ||
    lastBrace === -1
  ) {

    throw new Error(
      "No JSON object found in the LLM response."
    )
  }


  return cleaned.substring(
    firstBrace,
    lastBrace + 1
  )
}


/**
 * STEP 1
 *
 * Extract contextual slots from the project brief.
 */
export async function extractSlots(
  input: ExtractSlotsInput
): Promise<ExtractSlotsOutput> {

  const prompt =
    buildSlotExtractionPrompt(
      input.brief
    )


  console.log(
    "[HuggingFace] Extracting contextual slots..."
  )


  const rawResponse =
    await callHuggingFace(
      prompt
    )


  let parsed:
    Record<string, unknown>


  try {

    const jsonText =
      extractJsonObject(
        rawResponse
      )

    parsed =
      JSON.parse(jsonText)

  } catch {

    console.error(
      "Invalid slot extraction response:",
      rawResponse
    )

    throw new Error(
      "The LLM returned invalid JSON while extracting contextual information."
    )
  }


  const slots: Slot[] =
    (
      Object.keys(
        SLOT_DEFINITIONS
      ) as SlotId[]
    ).map((id) => {

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
          SLOT_DEFINITIONS[id]
            .label,

        value,

        missing:
          isSlotMissing(
            value
          ),
      }
    })


  console.log(
    "[HuggingFace] Slots extracted:",
    slots
  )


  return {
    slots,
  }
}


/**
 * STEP 2
 *
 * Generate the final ethical risk register.
 *
 * This receives:
 *
 * - original project brief
 * - extracted slots
 * - clarification answers
 * - experiment mode
 */
export async function generateRiskRegister(
  input: GenerateRiskRegisterInput
): Promise<GenerateRiskRegisterOutput> {

  const slotValues =
    Object.fromEntries(

      input.slots.map(
        (slot) => [
          slot.id,
          slot.value ??
            "not specified",
        ]
      )

    ) as Record<
      SlotId,
      string
    >


  const prompt =
    buildRiskRegisterPrompt(
      input.brief,
      slotValues,
      input.clarificationAnswers ??
        {}
    )


  console.log(
    "[HuggingFace] Generating risk register..."
  )


  const rawResponse =
    await callHuggingFace(
      prompt
    )


  let parsed:
    Partial<RiskRegister>


  try {

    const jsonText =
      extractJsonObject(
        rawResponse
      )

    parsed =
      JSON.parse(jsonText)

  } catch {

    console.error(
      "Invalid risk register response:",
      rawResponse
    )

    throw new Error(
      "The LLM returned invalid JSON while generating the ethical risk register."
    )
  }


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


  console.log(
    "[HuggingFace] Risk register generated:",
    register
  )


  return {
    register,
  }
}