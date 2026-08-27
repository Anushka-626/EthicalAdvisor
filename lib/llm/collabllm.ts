import {
  LLMService,
  ExtractSlotsInput,
  ExtractSlotsOutput,
  GenerateRiskRegisterInput,
  GenerateRiskRegisterOutput,
} from "./llmInterface"
import {
  Slot,
  SlotId,
  SLOT_DEFINITIONS,
  RiskRegister,
  isSlotMissing,
} from "../slots"
import {
  buildSlotExtractionPrompt,
  buildRiskRegisterPrompt,
  SYSTEM_PROMPT,
} from "../prompts"

// ── server-side only — no NEXT_PUBLIC_ prefix ─────────────────────────────────
const COLAB_URL = process.env.COLAB_URL

// ── call the Flask server running in Colab ────────────────────────────────────
async function callColab(prompt: string): Promise<string> {
  if (!COLAB_URL) {
    throw new Error("COLAB_URL is not set in .env.local")
  }

  const res = await fetch(`${COLAB_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: SYSTEM_PROMPT,   // ← Llama needs this for correct behaviour
      prompt,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Colab request failed ${res.status}: ${text}`)
  }

  const data = await res.json()

  if (!data.text) {
    throw new Error("Colab response missing 'text' field")
  }

  return data.text as string
}

// ── strip markdown fences if Llama wraps output in ```json ... ``` ─────────────
function extractJSON<T>(raw: string): T {
  const clean = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()
  return JSON.parse(clean) as T
}

// ── LLMService implementation ─────────────────────────────────────────────────
export const colabLLM: LLMService = {
  async extractSlots(input: ExtractSlotsInput): Promise<ExtractSlotsOutput> {
    const prompt = buildSlotExtractionPrompt(input.brief)
    const raw = await callColab(prompt)

    let slotValues: Record<string, string>
    try {
      slotValues = extractJSON<Record<string, string>>(raw)
    } catch {
      console.error("Slot extraction JSON parse failed. Raw:", raw)
      throw new Error("Model returned malformed JSON during slot extraction.")
    }

    const slots: Slot[] = (Object.keys(SLOT_DEFINITIONS) as SlotId[]).map((id) => {
      const value = slotValues[id] ?? null
      return {
        id,
        label: SLOT_DEFINITIONS[id].label,
        value,
        missing: isSlotMissing(value),
      }
    })

    return { slots }
  },

  async generateRiskRegister(
    input: GenerateRiskRegisterInput
  ): Promise<GenerateRiskRegisterOutput> {
    const slotValues = Object.fromEntries(
      input.slots.map((s) => [s.id, s.value ?? "not specified"])
    ) as Record<SlotId, string>

    const prompt = buildRiskRegisterPrompt(
      input.brief,
      slotValues,
      input.clarificationAnswers ?? {}
    )

    const raw = await callColab(prompt)

    let parsed: {
      projectTitle: string
      risks: RiskRegister["risks"]
      prioritisedActions: string[]
    }
    try {
      parsed = extractJSON(raw)
    } catch {
      console.error("Risk register JSON parse failed. Raw:", raw)
      throw new Error("Model returned malformed JSON during risk register generation.")
    }

    const register: RiskRegister = {
      projectTitle: parsed.projectTitle ?? "Untitled Project",
      generatedAt: new Date().toISOString(),
      mode: input.mode,
      slots: input.slots,
      risks: parsed.risks ?? [],
      prioritisedActions: parsed.prioritisedActions ?? [],
    }

    return { register }
  },
}