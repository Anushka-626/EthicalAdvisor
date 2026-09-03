import { SLOT_DEFINITIONS } from "./slots"
import type { SlotId } from "./slots"

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
  const slotList = Object.entries(SLOT_DEFINITIONS)
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
      : "No participant clarification answers were provided."


  return `
You are an expert in responsible AI and data science ethics.

Analyse the following MindAlert project and produce a structured ethical risk register.

IMPORTANT EXPERIMENTAL REQUIREMENTS:

- The project brief is fixed.
- Analyse the exact project provided.
- Do not replace the project with another project.
- Do not invent project details.
- Base the analysis primarily on the provided project brief.
- When additional contextual information is provided, incorporate it.
- Participant clarification answers provide additional context.
- When information is missing, explicitly acknowledge the uncertainty.
- Do not assume that an unspecified practice exists or does not exist.

==================================================
REQUIRED NUMBER OF RISKS
==================================================

You MUST identify EXACTLY 5 DISTINCT ETHICAL RISKS.

There must be exactly ONE risk for each of these five categories:

1. fairness
2. privacy
3. transparency
4. security
5. accountability

The five risks must be distinct.

Do NOT combine multiple categories into one risk.

Do NOT return fewer than 5 risks.

Do NOT return more than 5 risks.

==================================================
REQUIRED JSON FORMAT
==================================================

You MUST return ONLY a valid JSON object.

Do NOT include markdown.
Do NOT include explanations outside the JSON.
Do NOT include a preamble.
Do NOT use code fences.

The JSON must have exactly this structure:

{
  "projectTitle": "short descriptive title",
  "risks": [
    {
      "category": "fairness",
      "description": "clear one-sentence description of the specific fairness risk",
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
    },
    {
      "category": "privacy",
      "description": "clear one-sentence description of the specific privacy risk",
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
    },
    {
      "category": "transparency",
      "description": "clear one-sentence description of the specific transparency risk",
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
    },
    {
      "category": "security",
      "description": "clear one-sentence description of the specific security risk",
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
    },
    {
      "category": "accountability",
      "description": "clear one-sentence description of the specific accountability risk",
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

==================================================
RISK RULES
==================================================

1. Risk 1 MUST have category "fairness".

2. Risk 2 MUST have category "privacy".

3. Risk 3 MUST have category "transparency".

4. Risk 4 MUST have category "security".

5. Risk 5 MUST have category "accountability".

6. There MUST be exactly 5 risks.

7. Every risk must be distinct.

8. Every risk must be specifically connected to MindAlert.

9. Do not generate generic ethical statements that are unrelated to MindAlert.

10. Affected stakeholders must be based on the project context.

11. Do not invent stakeholders.

12. Do not invent system characteristics.

13. Severity MUST be exactly one of:

    "low"
    "medium"
    "high"
    "critical"

14. Likelihood MUST be exactly one of:

    "unlikely"
    "possible"
    "likely"
    "almost_certain"

15. Every risk MUST contain at least two concrete mitigations.

16. Mitigations must be actionable.

17. If important information is missing, acknowledge the uncertainty.

18. Do not treat "not specified" as evidence that something is absent.

19. Participant clarification answers, when present, should be incorporated into the relevant risks.

20. Do not use participant answers to invent facts that were not stated.

21. Return valid JSON only.

==================================================
RISK QUALITY REQUIREMENTS
==================================================

FAIRNESS:

Identify a MindAlert-specific concern about whether the system could perform differently across groups, populations, or types of students.

PRIVACY:

Identify a MindAlert-specific concern involving sensitive personal data, data collection, data use, storage, access, or disclosure.

TRANSPARENCY:

Identify a MindAlert-specific concern involving explainability, communication of predictions, uncertainty, or how affected people understand the system's output.

SECURITY:

Identify a MindAlert-specific concern involving protection of the data, model, system outputs, or access to the system.

ACCOUNTABILITY:

Identify a MindAlert-specific concern involving responsibility for decisions, human oversight, governance, appeals, or consequences arising from the system.

These descriptions are guidance only.

They do NOT authorize you to invent facts.

If the brief does not provide enough information to determine whether a specific practice exists, explicitly state that the information is not specified and describe the resulting ethical uncertainty.

==================================================
FIXED MINDALEERT PROJECT BRIEF
==================================================

"""
${brief}
"""

==================================================
ADDITIONAL CONTEXTUAL INFORMATION
==================================================

${slotSummary}

${answerSection}

==================================================
FINAL INTERNAL CHECK
==================================================

Before returning the JSON, verify internally that:

- There are exactly 5 risks.
- There is exactly one fairness risk.
- There is exactly one privacy risk.
- There is exactly one transparency risk.
- There is exactly one security risk.
- There is exactly one accountability risk.
- Every risk is specific to MindAlert.
- Every risk has affectedStakeholders.
- Every risk has severity.
- Every risk has likelihood.
- Every risk has at least two mitigations.
- Severity values are valid.
- Likelihood values are valid.
- The JSON is syntactically valid.
- No text appears outside the JSON object.

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