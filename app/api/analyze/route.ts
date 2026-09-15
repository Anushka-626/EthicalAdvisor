import { NextRequest, NextResponse } from "next/server"

import { llmService } from "@/lib/llm/llmService"
import type { ConversationMessage } from "@/lib/llm/llmInterface"

import {
  CLARIFY_FIRST_QUESTIONS,
  type Slot,
} from "@/lib/slots"

import { supabase as database } from "@/lib/supabaseClient"

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const UNGUIDED_PROMPT_VERSION =
  "unguided-v1.0"

const CLARIFY_PROMPT_VERSION =
  "clarify-first-v1.0"

const ONE_SHOT_PROMPT_VERSION =
  "one-shot-baseline-v1.0"

const TEMPERATURE = 0
const MAX_TOKENS = 2000

/* -------------------------------------------------------------------------- */
/* MindAlert project brief                                                    */
/* -------------------------------------------------------------------------- */

import {
  MINDALEERT_BRIEF,
} from "@/lib/studyConfig"
/* -------------------------------------------------------------------------- */
/* Helper functions                                                           */
/* -------------------------------------------------------------------------- */

function getModelName(): string {
  return (
    process.env.HF_MODEL ||
    process.env.LLM_MODEL ||
    "openai/gpt-oss-20b"
  )
}

/**
 * Return a generic error to the browser while keeping the
 * detailed error in the server logs.
 */
function publicError(
  message: string,
  status = 500
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  )
}

/**
 * Supabase may be typed as nullable depending on the
 * project's lib/supabaseClient implementation.
 */
function requireDatabase() {
  if (!database) {
    throw new Error(
      "Supabase client is not configured. Check SUPABASE_URL and SUPABASE_KEY."
    )
  }

  return database
}

/**
 * Convert condition order into a JSON-compatible value.
 *
 * study_responses.condition_order is JSONB.
 */
function getConditionOrderValue(
  conditionOrder: unknown
) {
  if (conditionOrder == null) {
    return null
  }

  if (typeof conditionOrder === "string") {
    return {
      order: conditionOrder,
    }
  }

  return conditionOrder
}

/**
 * Safely extract a conversation containing only
 * valid user/assistant messages.
 */
function getConversation(
  messages: unknown,
  conversation: unknown
): ConversationMessage[] {
  const source =
    Array.isArray(messages)
      ? messages
      : Array.isArray(conversation)
        ? conversation
        : []

  return source.filter(
    (
      message
    ): message is ConversationMessage => {
      if (
        typeof message !== "object" ||
        message === null
      ) {
        return false
      }

      const item =
        message as Record<string, unknown>

      return (
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string"
      )
    }
  )
}

/**
 * Normalize clarification answers received from the frontend.
 *
 * The frontend sends an object such as:
 *
 * {
 *   questionKey1: "answer",
 *   questionKey2: "answer",
 *   questionKey3: "answer"
 * }
 *
 * We intentionally do NOT access question.id or question.slotId
 * here because ClarificationQuestion does not expose those
 * properties.
 */
function normalizeClarificationAnswers(
  answers: unknown
): Record<string, string> {
  if (
    typeof answers !== "object" ||
    answers === null ||
    Array.isArray(answers)
  ) {
    return {}
  }

  const input =
    answers as Record<string, unknown>

  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      normalized[key] = value.trim()
    }
  }

  return normalized
}

/**
 * Validate the participant's clarification answers.
 *
 * We require exactly three non-empty answers.
 *
 * We deliberately do not reference:
 *   question.id
 *   question.slotId
 *
 * because those properties are not part of ClarificationQuestion.
 */
function validateClarificationAnswers(
  answers: Record<string, string>
): void {
  const values = Object.values(answers)

  if (values.length !== 3) {
    throw new Error(
      "Please answer all three clarification questions."
    )
  }

  const hasEmptyAnswer =
    values.some(
      (answer) =>
        !answer ||
        answer.trim().length === 0
    )

  if (hasEmptyAnswer) {
    throw new Error(
      "Please answer all three clarification questions."
    )
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json()

    const {
      action,
      session_id,
      task_type,
      condition_order,
      brief,
      mode,
      slots,
      clarificationAnswers,
      clarification_answers,
      messages,
      conversation,
      turn_count,
      interaction_duration_ms,
      duration_ms,
      answers,
    } = body

    /* ====================================================================== */
    /* CHAT                                                                   */
    /* ====================================================================== */

    if (action === "chat") {
      /*
       * Always fall back to the fixed MindAlert brief.
       */
      const projectBrief =
        typeof brief === "string" &&
        brief.trim()
          ? brief
          : MINDALEERT_BRIEF

      const chatConversation =
        getConversation(
          messages,
          conversation
        )

      try {
        const response =
          await llmService.generateChatResponse(
            projectBrief,
            chatConversation
          )

        return NextResponse.json({
          success: true,
          response,
        })
      } catch (error) {
        console.error(
          "Chat generation failed:",
          error
        )

        return publicError(
          "Failed to generate the AI response.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* EXTRACT SLOTS                                                          */
    /* ====================================================================== */

    if (action === "extract_slots") {
      const projectBrief =
        typeof brief === "string" &&
        brief.trim()
          ? brief
          : MINDALEERT_BRIEF

      try {
        const result =
          await llmService.extractSlots({
            brief: projectBrief,
          })

        return NextResponse.json({
          success: true,
          slots: result.slots,
          clarificationQuestions:
            CLARIFY_FIRST_QUESTIONS,
        })
      } catch (error) {
        console.error(
          "Slot extraction failed:",
          error
        )

        return publicError(
          "Failed to analyse the project brief.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* GENERATE CLARIFY-FIRST / ONE-SHOT                                     */
    /* ====================================================================== */

    if (action === "generate") {
      if (!session_id) {
        return publicError(
          "Missing session_id.",
          400
        )
      }

      /*
       * IMPORTANT:
       *
       * The study must always use the fixed MindAlert brief.
       *
       * We therefore use MINDALEERT_BRIEF as the authoritative
       * server-side project brief.
       */
      const projectBrief =
        MINDALEERT_BRIEF

      /* -------------------------------------------------------------------- */
      /* Strict mode validation                                               */
      /* -------------------------------------------------------------------- */

      if (
        mode !== "one_shot" &&
        mode !== "clarify_first"
      ) {
        console.error(
          "Invalid generate mode:",
          mode
        )

        return publicError(
          "Invalid analysis mode.",
          400
        )
      }

      const requestedMode =
        mode as
          | "one_shot"
          | "clarify_first"

      /* -------------------------------------------------------------------- */
      /* Resolve slots                                                        */
      /* -------------------------------------------------------------------- */

      let resolvedSlots: Slot[] = []

      if (Array.isArray(slots)) {
        resolvedSlots =
          slots as Slot[]
      } else if (
        requestedMode ===
        "clarify_first"
      ) {
        try {
          const extracted =
            await llmService.extractSlots({
              brief: projectBrief,
            })

          resolvedSlots =
            extracted.slots
        } catch (error) {
          console.error(
            "Automatic slot extraction failed:",
            error
          )

          return publicError(
            "Failed to analyse the project brief.",
            500
          )
        }
      }

      /* -------------------------------------------------------------------- */
      /* Resolve clarification answers                                        */
      /* -------------------------------------------------------------------- */

      const rawAnswers =
        clarificationAnswers ??
        clarification_answers ??
        {}

      const resolvedAnswers =
        normalizeClarificationAnswers(
          rawAnswers
        )

      /*
       * Only clarify-first requires the three participant answers.
       *
       * One-shot does not use participant answers.
       */
      if (
        requestedMode ===
        "clarify_first"
      ) {
        try {
          validateClarificationAnswers(
            resolvedAnswers
          )
        } catch (error) {
          console.error(
            "Invalid clarification answers:",
            error
          )

          return publicError(
            error instanceof Error
              ? error.message
              : "Please answer all three clarification questions.",
            400
          )
        }
      }

      /* -------------------------------------------------------------------- */
      /* Generate risk register                                               */
      /* -------------------------------------------------------------------- */

      const startTime = Date.now()

      let riskRegister

      try {
        const result =
          await llmService.generateRiskRegister(
            {
              brief: projectBrief,

              mode: requestedMode,

              slots: resolvedSlots,

              clarificationAnswers:
                requestedMode ===
                "clarify_first"
                  ? resolvedAnswers
                  : undefined,

              /*
               * One-shot and clarify-first do not use
               * the unguided conversation.
               */
              conversation: [],
            }
          )

        riskRegister =
          result.register
           } catch (error) {
        console.error(
          "================================================"
        )

        console.error(
          "RISK REGISTER GENERATION FAILED"
        )

        console.error(
          "Error:",
          error
        )

        console.error(
          "Generation context:",
          {
            mode: requestedMode,
            model: getModelName(),
            session_id,
            answerKeys:
              Object.keys(resolvedAnswers),
          }
        )

        console.error(
          "================================================"
        )

        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error)

        return publicError(
          `LLM generation failed: ${errorMessage}`,
          500
        )
      }

      const latencyMs =
        Date.now() - startTime

      /* -------------------------------------------------------------------- */
      /* Save participant submission                                          */
      /* -------------------------------------------------------------------- */

      let db

      try {
        db = requireDatabase()
      } catch (error) {
        console.error(
          "Database configuration error:",
          error
        )

        return publicError(
          "The study database is temporarily unavailable.",
          500
        )
      }

      try {
        const {
          error: saveError,
        } =
          await db
            .from("ethics_submissions")
            .insert({
              id: crypto.randomUUID(),

              session_id,

              task_type:
                task_type ??
                (
                  requestedMode ===
                  "clarify_first"
                    ? "taskB"
                    : "taskA"
                ),

              input_text:
                projectBrief,

              ai_output:
                JSON.stringify(
                  riskRegister
                ),

              condition_type:
                requestedMode ===
                "clarify_first"
                  ? "clarify_first"
                  : "one_shot",

              model_name:
                getModelName(),

              prompt_version:
                requestedMode ===
                "clarify_first"
                  ? CLARIFY_PROMPT_VERSION
                  : ONE_SHOT_PROMPT_VERSION,

              missing_slots:
                resolvedSlots
                  .filter(
                    (slot) =>
                      slot.missing
                  )
                  .map(
                    (slot) =>
                      slot.id
                  ),

              clarification_questions:
                requestedMode ===
                "clarify_first"
                  ? CLARIFY_FIRST_QUESTIONS
                  : [],

              clarification_answers:
                requestedMode ===
                "clarify_first"
                  ? resolvedAnswers
                  : {},

              latency_ms:
                latencyMs,

              mode:
                requestedMode,

              slots:
                resolvedSlots,

              condition_order:
                condition_order ??
                null,

              conversation: [],

              turn_count: 0,

              interaction_duration_ms:
                typeof duration_ms ===
                "number"
                  ? duration_ms
                  : null,

              model:
                getModelName(),

              temperature:
                TEMPERATURE,

              max_tokens:
                MAX_TOKENS,
            })

        if (saveError) {
          console.error(
            "Failed to save ethics submission:",
            saveError
          )

          return publicError(
            "Risk register was generated, but saving the submission failed.",
            500
          )
        }
      } catch (error) {
        console.error(
          "Database insert exception:",
          error
        )

        return publicError(
          "Risk register was generated, but saving the submission failed.",
          500
        )
      }

      /* -------------------------------------------------------------------- */
      /* Return register to frontend                                           */
      /* -------------------------------------------------------------------- */

      return NextResponse.json({
        success: true,

        /*
         * Both names are returned for compatibility
         * with different frontend components.
         */
        register: riskRegister,
        riskRegister,

        slots:
          resolvedSlots,

        latencyMs,
      })
    }

    /* ====================================================================== */
    /* GENERATE UNGUIDED                                                      */
    /* ====================================================================== */

    if (
      action ===
      "generate_unguided"
    ) {
      if (!session_id) {
        return publicError(
          "Missing session_id.",
          400
        )
      }

      /*
       * The fixed MindAlert brief is always used.
       */
      const projectBrief =
        MINDALEERT_BRIEF

      const unguidedConversation =
        getConversation(
          messages,
          conversation
        )

      const startTime = Date.now()

      let riskRegister

      try {
        /*
         * IMPORTANT:
         *
         * Unguided mode uses the exact same final
         * risk-register generator as clarify-first
         * and one-shot.
         *
         * Only the contextual information differs.
         */
        const result =
          await llmService.generateRiskRegister(
            {
              brief: projectBrief,

              mode: "unguided",

              slots: [],

              clarificationAnswers:
                undefined,

              conversation:
                unguidedConversation,
            }
          )

        riskRegister =
          result.register
      } catch (error) {
        console.error(
          "Unguided generation failed:",
          error
        )

        console.error(
          "Unguided generation context:",
          {
            model: getModelName(),
            session_id,
            conversationLength:
              unguidedConversation.length,
          }
        )

        return publicError(
          "Failed to generate the unguided risk register.",
          500
        )
      }

      const latencyMs =
        Date.now() - startTime

      const userTurnCount =
        typeof turn_count ===
        "number"
          ? turn_count
          : unguidedConversation.filter(
              (message) =>
                message.role ===
                "user"
            ).length

      const interactionDuration =
        typeof interaction_duration_ms ===
        "number"
          ? interaction_duration_ms
          : null

      let db

      try {
        db = requireDatabase()
      } catch (error) {
        console.error(
          "Database configuration error:",
          error
        )

        return publicError(
          "The study database is temporarily unavailable.",
          500
        )
      }

      try {
        const {
          error: saveError,
        } =
          await db
            .from("ethics_submissions")
            .insert({
              id: crypto.randomUUID(),

              session_id,

              task_type:
                task_type ??
                "taskA",

              input_text:
                projectBrief,

              ai_output:
                JSON.stringify(
                  riskRegister
                ),

              condition_type:
                "unguided",

              model_name:
                getModelName(),

              prompt_version:
                UNGUIDED_PROMPT_VERSION,

              missing_slots: [],

              clarification_questions:
                [],

              clarification_answers:
                {},

              latency_ms:
                latencyMs,

              mode:
                "unguided",

              slots: [],

              condition_order:
                condition_order ??
                null,

              conversation:
                unguidedConversation,

              turn_count:
                userTurnCount,

              interaction_duration_ms:
                interactionDuration,

              model:
                getModelName(),

              temperature:
                TEMPERATURE,

              max_tokens:
                MAX_TOKENS,
            })

        if (saveError) {
          console.error(
            "Failed to save unguided submission:",
            saveError
          )

          return publicError(
            "Risk register was generated, but saving the submission failed.",
            500
          )
        }
      } catch (error) {
        console.error(
          "Unguided database insert exception:",
          error
        )

        return publicError(
          "Risk register was generated, but saving the submission failed.",
          500
        )
      }

      return NextResponse.json({
        success: true,

        register:
          riskRegister,

        riskRegister,

        latencyMs,
      })
    }

    /* ====================================================================== */
    /* GENERATE ONE-SHOT BASELINE                                             */
    /* ====================================================================== */

    if (
      action ===
      "generate_baseline"
    ) {
      /*
       * Baseline must use the fixed MindAlert brief.
       */
      const projectBrief =
        MINDALEERT_BRIEF

      const startTime = Date.now()

      let riskRegister

      try {
        const result =
          await llmService.generateRiskRegister(
            {
              brief:
                projectBrief,

              mode:
                "one_shot",

              slots: [],

              clarificationAnswers:
                undefined,

              conversation: [],
            }
          )

        riskRegister =
          result.register
      } catch (error) {
        console.error(
          "Baseline generation failed:",
          error
        )

        console.error(
          "Baseline generation context:",
          {
            model:
              getModelName(),
          }
        )

        return publicError(
          "Failed to generate the baseline.",
          500
        )
      }

      const latencyMs =
        Date.now() - startTime

      let db

      try {
        db = requireDatabase()
      } catch (error) {
        console.error(
          "Database configuration error:",
          error
        )

        return publicError(
          "The study database is temporarily unavailable.",
          500
        )
      }

      try {
        /*
         * Baseline is stored separately and
         * is never shown to participants.
         */
        const {
          error: saveError,
        } =
          await db
            .from("ethics_baseline")
            .insert({
              brief:
                projectBrief,

              brief_version:
                "mindalert-v1",

              model:
                getModelName(),

              prompt_version:
                ONE_SHOT_PROMPT_VERSION,

              temperature:
                TEMPERATURE,

              max_tokens:
                MAX_TOKENS,

              risk_register:
                riskRegister,
            })

        if (saveError) {
          console.error(
            "Failed to save baseline:",
            saveError
          )

          return publicError(
            "Baseline was generated, but saving failed.",
            500
          )
        }
      } catch (error) {
        console.error(
          "Baseline database insert exception:",
          error
        )

        return publicError(
          "Baseline was generated, but saving failed.",
          500
        )
      }

     return NextResponse.json({
  success: true,
  register: riskRegister,
  latencyMs,
 })
    }

    /* ====================================================================== */
    /* SAVE SURVEY                                                            */
    /* ====================================================================== */

    if (action === "save_survey") {
      if (!session_id) {
        return publicError(
          "Missing session_id.",
          400
        )
      }

      if (
        !answers ||
        typeof answers !== "object"
      ) {
        return publicError(
          "Missing or invalid survey answers.",
          400
        )
      }

      const isSurveyA =
        task_type === "surveyA"

      const isSurveyB =
        task_type === "surveyB"

      if (!isSurveyA && !isSurveyB) {
        return publicError(
          "Invalid survey type.",
          400
        )
      }

      try {
        const conditionOrderValue =
          getConditionOrderValue(
            condition_order
          )

        /*
         * Database columns:
         *
         * survey_a_time_ms
         * survey_b_time_ms
         *
         * There are no submitted_at columns.
         */
        const surveyTimeMs =
          typeof duration_ms ===
          "number"
            ? duration_ms
            : null

        let db

        try {
          db = requireDatabase()
        } catch (error) {
          console.error(
            "Database configuration error:",
            error
          )

          return publicError(
            "The study database is temporarily unavailable.",
            500
          )
        }

        /* ------------------------------------------------------------------ */
        /* Find existing participant response                                 */
        /* ------------------------------------------------------------------ */

        const {
          data: existingResponse,
          error: lookupError,
        } = await db
          .from("study_responses")
          .select(
            "id, participant_id"
          )
          .eq(
            "participant_id",
            session_id
          )
          .limit(1)
          .maybeSingle()

        if (lookupError) {
          console.error(
            "Failed to look up survey response:",
            lookupError
          )

          return publicError(
            "Failed to check the existing survey response.",
            500
          )
        }

        /* ------------------------------------------------------------------ */
        /* UPDATE                                                              */
        /* ------------------------------------------------------------------ */

        if (existingResponse) {
          const updateData =
            isSurveyA
              ? {
                  survey_a:
                    answers,

                  survey_a_time_ms:
                    surveyTimeMs,

                  condition_order:
                    conditionOrderValue,
                }
              : {
                  survey_b:
                    answers,

                  survey_b_time_ms:
                    surveyTimeMs,

                  condition_order:
                    conditionOrderValue,
                }

          const {
            error: updateError,
          } = await db
            .from("study_responses")
            .update(updateData)
            .eq(
              "participant_id",
              session_id
            )

          if (updateError) {
            console.error(
              "Failed to update survey:",
              updateError
            )

            return publicError(
              "Failed to update the survey.",
              500
            )
          }

          return NextResponse.json({
            success: true,

            message:
              "Survey updated successfully.",
          })
        }

        /* ------------------------------------------------------------------ */
        /* INSERT                                                              */
        /* ------------------------------------------------------------------ */

        const insertData = {
          participant_id:
            session_id,

          session_id:
            session_id,

          task_type:
            task_type,

          survey_a:
            isSurveyA
              ? answers
              : null,

          survey_b:
            isSurveyB
              ? answers
              : null,

          survey_a_time_ms:
            isSurveyA
              ? surveyTimeMs
              : null,

          survey_b_time_ms:
            isSurveyB
              ? surveyTimeMs
              : null,

          condition_order:
            conditionOrderValue,

          created_at:
            new Date().toISOString(),
        }

        const {
          error: insertError,
        } = await db
          .from("study_responses")
          .insert(
            insertData
          )

        if (insertError) {
          console.error(
            "Failed to insert survey:",
            insertError
          )

          return publicError(
            "Failed to save the survey.",
            500
          )
        }

        return NextResponse.json({
          success: true,

          message:
            "Survey saved successfully.",
        })
      } catch (error) {
        console.error(
          "Save survey exception:",
          error
        )

        return publicError(
          "Failed to save the survey.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* UNKNOWN ACTION                                                         */
    /* ====================================================================== */

    console.error(
      "Unknown API action:",
      action
    )

    return publicError(
      "Invalid request.",
      400
    )
  } catch (error) {
    console.error(
      "API /analyze error:",
      error
    )

    return publicError(
      "Internal server error.",
      500
    )
  }
}