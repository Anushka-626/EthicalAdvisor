import { SLOT_DEFINITIONS, SlotId } from "./slots"

export function buildSlotExtractionPrompt(brief: string): string {
  const slotList = Object.entries(SLOT_DEFINITIONS)
    .map(([id, def]) => `- "${id}": ${def.description}`)
    .join("\n")

  return `You are an ethical risk analyst reviewing a data science project brief.
Extract the following contextual slots from the brief below.
For each slot, provide the extracted value as a short phrase or sentence.
If a slot is not described or cannot be inferred, return exactly the string "not specified".
Do NOT speculate or invent information.

Slots to extract:
${slotList}

Return ONLY a valid JSON object with exactly these keys:
stakeholders, provenance, setting, automation, consequences, feedback_loops

Project brief:
"""
${brief}
"""

JSON output:`
}

export function buildRiskRegisterPrompt(
  brief: string,
  slotValues: Record<SlotId, string>,
  clarificationAnswers: Record<string, string> = {}
): string {
  const slotSummary = Object.entries(slotValues)
    .map(([id, val]) => `${SLOT_DEFINITIONS[id as SlotId]?.label ?? id}: ${val}`)
    .join("\n")

  const answerSection = Object.keys(clarificationAnswers).length > 0
    ? `\nAdditional context from clarification questions:\n${Object.entries(clarificationAnswers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}`
    : ""

  return `You are an expert in responsible AI and data science ethics.
Analyse the project described below and produce a structured ethical risk register.

You MUST return ONLY a valid JSON object — no markdown, no explanation, no preamble.

The JSON must have this exact structure:
{
  "projectTitle": "short descriptive title (max 8 words)",
  "risks": [
    {
      "category": one of: "fairness" | "privacy" | "transparency" | "security" | "accountability",
      "description": "clear one-sentence description of the specific risk",
      "affectedStakeholders": ["list", "of", "stakeholders"],
      "severity": one of: "low" | "medium" | "high" | "critical",
      "likelihood": one of: "unlikely" | "possible" | "likely" | "almost_certain",
      "mitigations": ["concrete actionable step 1", "concrete actionable step 2"]
    }
  ],
  "prioritisedActions": ["Top 3-5 most important actions, ordered by priority"]
}

Rules:
- Identify 3-6 distinct risks across different categories where possible
- Mitigations must be concrete and specific to THIS project, not generic advice
- Base severity/likelihood on the contextual slots provided
- If a slot is "not specified", note this uncertainty in the relevant risk description

Project brief:
"""
${brief}
"""

Contextual slots:
${slotSummary}
${answerSection}

JSON output:`
}

export const SYSTEM_PROMPT = `You are a conversational ethics advisor specialising in data science and AI projects.
Your role is to help researchers and students identify, structure, and mitigate ethical risks in their projects.
You always respond with well-reasoned, context-specific analysis grounded in established AI ethics frameworks
(fairness, privacy, transparency, accountability, security).
You never give generic advice — every output must be tied to the specific project context provided.
When information is missing, you acknowledge the uncertainty rather than speculate.`