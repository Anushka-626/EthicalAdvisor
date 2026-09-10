import { SLOT_DEFINITIONS } from "./slots"

/**
 * =========================================================
 * SLOT EXTRACTION
 * =========================================================
 */

export function buildSlotExtractionPrompt(
  brief: string
): string {
  const slotList =
    Object.entries(SLOT_DEFINITIONS)
      .map(
        ([id, def]) =>
          `- "${id}": ${def.description}`
      )
      .join("\n")

  return `You are an ethical risk analyst reviewing a data science project brief.

Extract the following contextual slots from the project brief.

For each slot, provide a short phrase or sentence.

If the information is not explicitly stated in the brief, return exactly:
"not specified"

Do NOT speculate or invent information.

Slots:
${slotList}

Return ONLY one valid JSON object.

The JSON object must contain exactly these six keys:

{
  "stakeholders": "string",
  "provenance": "string",
  "setting": "string",
  "automation": "string",
  "consequences": "string",
  "feedback_loops": "string"
}

Project brief:
${brief}

Remember:
- Output JSON only.
- No Markdown.
- No code fences.
- No explanation.
- Do not add extra keys.`
}


/**
 * =========================================================
 * HIDDEN ONE-SHOT BASELINE
 * =========================================================
 */

export function buildOneShotBaselinePrompt(
  brief: string
): string {
  return `You are an expert AI ethics advisor.

Generate a structured ethical risk register for the project described below.

IMPORTANT:
Use ONLY information contained in the project brief.
Do not ask questions.
Do not invent project facts.
Do not invent stakeholders, data sources, safeguards, or outcomes.

Identify relevant risks from these categories:
- fairness
- privacy
- transparency
- security
- accountability

Each risk must contain:
- category
- description
- affectedStakeholders
- severity
- likelihood
- mitigations

Allowed category values:
"fairness"
"privacy"
"transparency"
"security"
"accountability"

Allowed severity values:
"low"
"medium"
"high"

Allowed likelihood values:
"low"
"medium"
"high"

Return ONLY one valid JSON object.

Use exactly this structure:

{
  "projectTitle": "MindAlert Ethical Risk Analysis",
  "risks": [
    {
      "category": "privacy",
      "description": "specific ethical risk",
      "affectedStakeholders": ["students"],
      "severity": "high",
      "likelihood": "high",
      "mitigations": [
        "specific actionable mitigation"
      ]
    }
  ],
  "prioritisedActions": [
    "most important action",
    "second most important action",
    "third most important action"
  ]
}

Rules:
- "risks" must be an array.
- "affectedStakeholders" must be an array of strings.
- "mitigations" must be an array of strings.
- "prioritisedActions" must be an array of strings.
- Use lowercase category/severity/likelihood values exactly as specified.
- Include only relevant risks.
- Do not add extra JSON fields.
- Do not use Markdown.
- Do not use code fences.
- Do not include any explanation outside the JSON.

Project brief:
${brief}

JSON:`
}


/**
 * =========================================================
 * UNGUIDED LLM CHAT
 * =========================================================
 */

export function buildUnguidedChatPrompt(
  brief: string,
  conversation: Array<{
    role: "user" | "assistant"
    content: string
  }>
): string {
  const conversationText =
    conversation
      .map(
        (message) =>
          `${
            message.role === "user"
              ? "Student"
              : "AI ethics advisor"
          }: ${message.content}`
      )
      .join("\n\n")

  return `You are an AI ethics advisor for data science projects.

The student is analysing this project:

PROJECT BRIEF:
${brief}

The student is using an unguided AI ethics advisor.

The student decides what to ask and may ask follow-up questions.

There are NO predefined clarification questions in this condition.

Help the student identify and understand ethical risks.

Your responses should:
- remain specific to the MindAlert project;
- discuss relevant ethical risks;
- discuss stakeholders where relevant;
- discuss fairness, privacy, transparency, security, and accountability where relevant;
- explain uncertainty when information is missing;
- avoid inventing project facts.

Clearly distinguish:
1. facts stated in the project brief;
2. general ethical considerations;
3. possible recommendations.

Do not tell the student which predefined questions to answer.

CONVERSATION:
${conversationText}

Respond directly to the student's latest question.`
}


/**
 * =========================================================
 * FINAL UNGUIDED RISK REGISTER
 * =========================================================
 */

export function buildUnguidedRiskRegisterPrompt(
  brief: string,
  conversation: Array<{
    role: "user" | "assistant"
    content: string
  }>
): string {
  const conversationText =
    conversation
      .map(
        (message) =>
          `${
            message.role === "user"
              ? "Student"
              : "AI ethics advisor"
          }: ${message.content}`
      )
      .join("\n\n")

  return `You are an expert AI ethics advisor.

Generate the FINAL structured ethical risk register for the MindAlert project.

You MUST use BOTH sources:

SOURCE 1 — ORIGINAL PROJECT BRIEF
This is the authoritative description of the project.

SOURCE 2 — COMPLETE UNGUIDED CONVERSATION
This shows which ethical issues the student explored.

Use relevant information from both sources.

IMPORTANT:
- Do not invent project facts.
- Do not invent data sources.
- Do not invent stakeholders.
- Do not assume safeguards already exist.
- Student or AI suggestions are not automatically project facts.
- Preserve uncertainty where information is missing.
- Include only relevant ethical risks.

Allowed risk categories:
"fairness"
"privacy"
"transparency"
"security"
"accountability"

Allowed severity values:
"low"
"medium"
"high"

Allowed likelihood values:
"low"
"medium"
"high"

Every risk MUST contain exactly:
- category
- description
- affectedStakeholders
- severity
- likelihood
- mitigations

The JSON structure is:

{
  "projectTitle": "MindAlert Ethical Risk Analysis",
  "risks": [
    {
      "category": "privacy",
      "description": "specific ethical risk",
      "affectedStakeholders": ["students"],
      "severity": "high",
      "likelihood": "high",
      "mitigations": [
        "specific actionable mitigation"
      ]
    }
  ],
  "prioritisedActions": [
    "most important action",
    "second most important action",
    "third most important action"
  ]
}

STRICT OUTPUT RULES:
- Return exactly ONE JSON object.
- Start the response with {.
- End the response with }.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT write an introduction.
- Do NOT write an explanation after the JSON.
- Do NOT add extra keys.
- "risks" must be an array.
- "affectedStakeholders" must be an array of strings.
- "mitigations" must be an array of strings.
- "prioritisedActions" must be an array of strings.
- Use lowercase values for category, severity, and likelihood.

ORIGINAL PROJECT BRIEF:
${brief}

COMPLETE UNGUIDED CONVERSATION:
${conversationText}

Now return ONLY the JSON object.`
}


/**
 * =========================================================
 * CLARIFY-FIRST FINAL RISK REGISTER
 * =========================================================
 */

export function buildClarifyFirstRiskRegisterPrompt(
  brief: string,
  questions: Array<{
    id: string
    question: string
  }>,
  answers: Record<string, string>
): string {
  const clarificationText =
    questions
      .map(
        (question, index) =>
          `Question ${index + 1}: ${question.question}
Participant answer: ${
            answers[question.id] ?? ""
          }`
      )
      .join("\n\n")

  return `You are an expert AI ethics advisor.

Generate the FINAL structured ethical risk register for the MindAlert project.

You MUST use all three sources:

SOURCE 1 — ORIGINAL PROJECT BRIEF
The authoritative description of the project.

SOURCE 2 — FIXED CLARIFICATION QUESTIONS
The same questions are used for every participant.

SOURCE 3 — PARTICIPANT ANSWERS
These provide additional contextual information and proposed preferences or safeguards.

Participant answers may influence:
- identified risks;
- affected stakeholders;
- severity;
- likelihood;
- mitigation recommendations.

IMPORTANT:
- Do not invent project facts.
- Do not treat participant proposals as safeguards that are already implemented.
- Distinguish proposed safeguards from existing safeguards.
- Preserve uncertainty where appropriate.
- Do not invent stakeholders or data sources.
- Include only relevant ethical risks.

Allowed risk categories:
"fairness"
"privacy"
"transparency"
"security"
"accountability"

Allowed severity values:
"low"
"medium"
"high"

Allowed likelihood values:
"low"
"medium"
"high"

Every risk MUST contain exactly:
- category
- description
- affectedStakeholders
- severity
- likelihood
- mitigations

Return exactly this JSON structure:

{
  "projectTitle": "MindAlert Ethical Risk Analysis",
  "risks": [
    {
      "category": "privacy",
      "description": "specific ethical risk",
      "affectedStakeholders": ["students"],
      "severity": "high",
      "likelihood": "high",
      "mitigations": [
        "specific actionable mitigation"
      ]
    }
  ],
  "prioritisedActions": [
    "most important action",
    "second most important action",
    "third most important action"
  ]
}

STRICT OUTPUT RULES:
- Return exactly ONE JSON object.
- Start with {.
- End with }.
- Do NOT use Markdown.
- Do NOT use code fences.
- Do NOT add explanations.
- Do NOT add extra JSON keys.
- "risks" must be an array.
- "affectedStakeholders" must be an array of strings.
- "mitigations" must be an array of strings.
- "prioritisedActions" must be an array of strings.
- Use lowercase category/severity/likelihood values.

ORIGINAL PROJECT BRIEF:
${brief}

FIXED CLARIFICATION QUESTIONS AND PARTICIPANT ANSWERS:
${clarificationText}

Now return ONLY the JSON object.`
}


/**
 * =========================================================
 * GENERAL SYSTEM PROMPT
 * =========================================================
 */

export const SYSTEM_PROMPT = `
You are a conversational AI ethics advisor specialising in
data science and AI projects.

Your role is to help students identify, understand, structure,
and mitigate ethical risks.

Relevant ethical dimensions include:
- fairness
- privacy
- transparency
- security
- accountability

When information is missing, acknowledge the uncertainty
rather than inventing information.

Do not fabricate project facts, stakeholders, data sources,
safeguards, or outcomes.
`