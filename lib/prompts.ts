import {
  SLOT_DEFINITIONS,
  SlotId,
} from "./slots"

/**
 * Build the prompt used to extract contextual information
 * from the fixed MindAlert project brief.
 *
 * IMPORTANT:
 * This function is used only for the clarify-first condition.
 *
 * It is NOT used by the one-shot condition.
 */
export function buildSlotExtractionPrompt(
  brief: string
): string {
  const slotList = Object.entries(
    SLOT_DEFINITIONS
  )
    .map(
      ([id, def]) =>
        `- "${id}": ${def.description}`
    )
    .join("\n")

  return `
You are an ethical risk analyst reviewing a data science project brief.

Extract the following contextual information from the project brief.

For each slot:
- Provide the information explicitly stated in the brief.
- If the information is not provided, return exactly "not specified".
- Do NOT speculate.
- Do NOT invent information.

Slots to extract:

${slotList}

Return ONLY a valid JSON object with exactly these keys:

{
  "stakeholders": "...",
  "provenance": "...",
  "setting": "...",
  "automation": "...",
  "consequences": "...",
  "feedback_loops": "..."
}

Fixed project brief:

"""
${brief}
"""

JSON output:
`.trim()
}


/**
 * Build the prompt used to generate the final
 * ethical risk register.
 *
 * This function is used for BOTH experimental conditions.
 *
 * Condition A:
 *   - slotValues is omitted
 *   - clarificationAnswers is empty
 *   - the model analyses the project brief directly
 *
 * Condition B:
 *   - slotValues contains extracted contextual information
 *   - clarificationAnswers contains participant answers
 *   - the additional information is incorporated
 */
export function buildRiskRegisterPrompt(
  brief: string,
  slotValues: Partial<Record<SlotId, string>> = {},
  clarificationAnswers: Record<string, string> = {}
): string {

  const hasSlotValues =
    Object.keys(slotValues).length > 0

  const slotSummary = hasSlotValues
    ? Object.entries(slotValues)
        .map(
          ([id, value]) =>
            `${SLOT_DEFINITIONS[id as SlotId]?.label ?? id}: ${
              value || "not specified"
            }`
        )
        .join("\n")
    : "No separately extracted contextual information is provided. Analyse the project brief directly."

  const hasClarificationAnswers =
    Object.keys(clarificationAnswers).length > 0

  const answerSection =
    hasClarificationAnswers
      ? `
Additional context provided by the participant through clarification questions:

${Object.entries(clarificationAnswers)
  .map(
    ([question, answer]) =>
      `Question: ${question}\nAnswer: ${answer}`
  )
  .join("\n\n")}
`
      : ""

  return `
You are an expert in responsible AI and data science ethics.

Analyse the following MindAlert project and produce a structured ethical risk register.

IMPORTANT:
- The project brief is fixed.
- Do not replace the project with another project.
- Do not invent project details.
- Base the analysis primarily on the provided project brief.
- When additional contextual information is provided, incorporate it into the analysis.
- When information is missing, explicitly acknowledge the uncertainty.
- Produce context-specific ethical risks.
- Do not assume information that is not provided.

You MUST return ONLY a valid JSON object.
Do NOT include markdown.
Do NOT include explanations.
Do NOT include a preamble.

The JSON must have exactly this structure:

{
  "projectTitle": "short descriptive title",
  "risks": [
    {
      "category": "fairness | privacy | transparency | security | accountability",
      "description": "clear one-sentence description of the specific ethical risk",
      "affectedStakeholders": [
        "stakeholder 1",
        "stakeholder 2"
      ],
      "severity": "low | medium | high | critical",
      "likelihood": "unlikely | possible | likely | almost_certain",
      "mitigations": [
        "concrete actionable mitigation 1",
        "concrete actionable mitigation 2"
      ]
    }
  ],
  "prioritisedActions": [
    "highest priority action",
    "second priority action",
    "third priority action"
  ]
}

Rules:

1. Identify 3-6 distinct ethical risks.

2. Use the following categories where relevant:
   - fairness
   - privacy
   - transparency
   - security
   - accountability

3. Risks must be specific to the MindAlert project.

4. Affected stakeholders must be based on the project context.

5. Severity must be one of:
   - low
   - medium
   - high
   - critical

6. Likelihood must be one of:
   - unlikely
   - possible
   - likely
   - almost_certain

7. Mitigations must be concrete and actionable.

8. Do not invent facts that are not supported by the brief.

9. If contextual information is "not specified", acknowledge that uncertainty where relevant.

10. Participant clarification answers, when present, provide additional context and should be incorporated into the final risk analysis.

11. Do not treat missing contextual information as evidence that a particular practice does or does not occur.

Fixed MindAlert project brief:

"""
${brief}
"""

Additional contextual information:

${slotSummary}

${answerSection}

JSON output:
`.trim()
}


/**
 * System prompt shared by the ethics advisor.
 */
export const SYSTEM_PROMPT = `
You are a conversational ethics advisor specialising in
data science and AI projects.

Your role is to help researchers and students identify,
structure, and mitigate ethical risks.

You must:
- analyse the project actually provided;
- avoid inventing information;
- acknowledge missing information;
- produce context-specific ethical analysis;
- consider fairness, privacy, transparency,
  security, and accountability;
- follow the requested JSON output format exactly
  when JSON is requested.

You must not replace the provided project with a
different project.
`.trim()