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

const UNGUIDED_PROMPT_VERSION = "unguided-v1.0"
const CLARIFY_PROMPT_VERSION = "clarify-first-v1.0"
const ONE_SHOT_PROMPT_VERSION = "one-shot-baseline-v1.0"

const BRIEF_VERSION = "mindalert-v1.0"

const TEMPERATURE = 0
const MAX_TOKENS = 2000

/* -------------------------------------------------------------------------- */
/* MindAlert project brief                                                    */
/* -------------------------------------------------------------------------- */

const MINDALEERT_BRIEF = `
MindAlert is an AI-powered mental health risk detection system being developed
by CampusCare Solutions for use in university settings.

The system is designed to predict the mental health risk level of students
on a weekly basis. It combines multiple sources of student-related data,
including grades, attendance, assignment submission patterns, dropout,
university login activity, health centre records, Twitter/X and Instagram
posts using student email handles, and financial aid information.

The model produces a weekly risk classification of Low, Medium, or High.

For students classified as high-risk, the system sends a check-in email.
Risk information is also made available through a dashboard used by the
Dean of Students and counselling staff.

Students are not explicitly notified that their data is being used by
MindAlert for this risk prediction.

The system is retrained monthly using feedback from the system's use.

The project has the following goals and constraints:

- No infrastructure, audit, or monitoring budget is available.
- Weekly predictions must be completed within two hours on Monday.
- Counsellors need explanations for the model's predictions.
- The target is 80% recall within two weeks.
- The project aims to reduce workload by 30%.
- The system is intended to be deployed at five universities within
  twelve months.

Important ethical and operational details are intentionally not fully
specified in the project brief and may require clarification.
`

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
 * Return a safe error to the browser while keeping
 * detailed information in the server logs.
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
 * project's Supabase client implementation.
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
 * Keep condition_order consistent with the database.
 *
 * The study frontend normally sends:
 *   "A_B"
 *   "B_A"
 *
 * If an object is already supplied, preserve it.
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
 * Safely extract valid conversation messages.
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
 * Convert arbitrary values into a plain object suitable
 * for JSONB storage.
 */
function getAnswersObject(
  value: unknown
): Record<string, unknown> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>
  }

  return {}
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
    /* CHAT                                                                    */
    /* ====================================================================== */

    if (action === "chat") {
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
    /* EXTRACT SLOTS                                                           */
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

          /*
           * These are the fixed clarification questions
           * used by the Clarify-first condition.
           */
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
    /* GENERATE CLARIFY-FIRST / ONE-SHOT                                      */
    /* ====================================================================== */

    if (action === "generate") {
      if (!session_id) {
        return publicError(
          "Missing session_id.",
          400
        )
      }

      const projectBrief =
        typeof brief === "string" &&
        brief.trim()
          ? brief
          : MINDALEERT_BRIEF

      /* -------------------------------------------------------------------- */
      /* Validate mode                                                        */
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
        requestedMode === "clarify_first"
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
      /* Resolve clarification answers                                         */
      /* -------------------------------------------------------------------- */

      const resolvedAnswers =
        clarificationAnswers ??
        clarification_answers ??
        {}

      const startTime = Date.now()

      try {
        /*
         * IMPORTANT:
         *
         * The final risk-register generator is the same
         * generator used for all experimental conditions.
         *
         * Only the available context differs:
         *
         * One-shot:
         *   brief only
         *
         * Clarify-first:
         *   brief + clarification answers
         *
         * Unguided:
         *   brief + conversation
         */

        const result =
          await llmService.generateRiskRegister(
            {
              brief: projectBrief,

              mode: requestedMode,

              slots: resolvedSlots,

              clarificationAnswers:
                requestedMode === "clarify_first"
                  ? resolvedAnswers
                  : undefined,

              conversation: [],
            }
          )

        const latencyMs =
          Date.now() - startTime

        const riskRegister =
          result.register

        /* ------------------------------------------------------------------ */
        /* Database                                                            */
        /* ------------------------------------------------------------------ */

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
        /* Save participant submission                                         */
        /* ------------------------------------------------------------------ */

        /*
         * IMPORTANT:
         *
         * ethics_submissions does NOT have a "brief" column.
         *
         * Therefore:
         *   input_text = project brief
         *   ai_output  = generated risk register
         *
         * Also, id is an identity/int8 column in the database,
         * so we deliberately DO NOT provide crypto.randomUUID().
         */

        const { error: saveError } =
          await db
            .from("ethics_submissions")
            .insert({
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

              conversation:
                [],

              turn_count:
                0,

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

        return NextResponse.json({
          success: true,
          register: riskRegister,
          riskRegister,
          slots: resolvedSlots,
          latencyMs,
        })
      } catch (error) {
        console.error(
          "Risk register generation failed:",
          error
        )

        return publicError(
          "Failed to generate the ethical risk register.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* GENERATE UNGUIDED                                                       */
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

      const projectBrief =
        typeof brief === "string" &&
        brief.trim()
          ? brief
          : MINDALEERT_BRIEF

      const unguidedConversation =
        getConversation(
          messages,
          conversation
        )

      const startTime = Date.now()

      try {
        /*
         * IMPORTANT:
         *
         * Unguided uses the SAME final risk-register
         * generator as Clarify-first and One-shot.
         *
         * The only difference is that the context contains
         * the participant's free conversation.
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

        const latencyMs =
          Date.now() - startTime

        const riskRegister =
          result.register

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

        /*
         * ethics_submissions stores:
         *
         * input_text = fixed project brief
         * ai_output  = final risk register
         * conversation = complete unguided conversation
         *
         * id is omitted because it is generated by the database.
         */

        const { error: saveError } =
          await db
            .from("ethics_submissions")
            .insert({
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

              missing_slots:
                [],

              clarification_questions:
                [],

              clarification_answers:
                {},

              latency_ms:
                latencyMs,

              mode:
                "unguided",

              slots:
                [],

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

        return NextResponse.json({
          success: true,
          register: riskRegister,
          riskRegister,
          latencyMs,
        })
      } catch (error) {
        console.error(
          "Unguided generation failed:",
          error
        )

        return publicError(
          "Failed to generate the unguided risk register.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* GENERATE ONE-SHOT BASELINE                                              */
    /* ====================================================================== */

    if (
      action ===
      "generate_baseline"
    ) {
      const projectBrief =
        typeof brief === "string" &&
        brief.trim()
          ? brief
          : MINDALEERT_BRIEF

      const startTime = Date.now()

      try {
        /*
         * One-shot baseline uses ONLY the fixed brief.
         *
         * No participant conversation.
         * No clarification answers.
         * No participant-generated context.
         */

        const result =
          await llmService.generateRiskRegister(
            {
              brief:
                projectBrief,

              mode:
                "one_shot",

              slots:
                [],

              clarificationAnswers:
                undefined,

              conversation:
                [],
            }
          )

        const latencyMs =
          Date.now() - startTime

        const riskRegister =
          result.register

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

        /*
         * IMPORTANT:
         *
         * The one-shot baseline is stored ONLY in
         * ethics_baseline.
         *
         * It is not a participant submission.
         *
         * prompt_version is always:
         * one-shot-baseline-v1.0
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
                BRIEF_VERSION,

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

        return NextResponse.json({
          success: true,
          register: riskRegister,
          riskRegister,
          latencyMs,
        })
      } catch (error) {
        console.error(
          "Baseline generation failed:",
          error
        )

        return publicError(
          "Failed to generate the baseline.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* SAVE SURVEY                                                             */
    /* ====================================================================== */

    if (
      action ===
      "save_survey"
    ) {
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

      if (
        !isSurveyA &&
        !isSurveyB
      ) {
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
         * IMPORTANT:
         *
         * study_responses contains:
         *
         * survey_a_time_ms
         * survey_b_time_ms
         *
         * NOT:
         * survey_a_time
         * survey_b_time
         *
         * The duration is stored in milliseconds.
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
        /* Find existing participant response                                  */
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
        /* UPDATE existing response                                             */
        /* ------------------------------------------------------------------ */

        if (existingResponse) {
          const updateData =
            isSurveyA
              ? {
                  survey_a:
                    getAnswersObject(
                      answers
                    ),

                  survey_a_time_ms:
                    surveyTimeMs,

                  condition_order:
                    conditionOrderValue,
                }
              : {
                  survey_b:
                    getAnswersObject(
                      answers
                    ),

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
        /* INSERT first survey response                                         */
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
              ? getAnswersObject(
                  answers
                )
              : null,

          survey_b:
            isSurveyB
              ? getAnswersObject(
                  answers
                )
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
    /* SAVE FINAL COMPARISON                                                   */
    /* ====================================================================== */

    if (
      action ===
      "save_comparison"
    ) {
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
          "Missing or invalid comparison response.",
          400
        )
      }

      try {
        const db =
          requireDatabase()

        const comparisonAnswers =
          getAnswersObject(
            answers
          )

        const conditionOrderValue =
          getConditionOrderValue(
            condition_order
          )

        /*
         * Final comparison belongs to the participant's
         * study_responses row.
         *
         * It is NOT a separate task_type.
         *
         * The database column is:
         *
         *   final_comparison JSONB
         */

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
            "Failed to find response for comparison:",
            lookupError
          )

          return publicError(
            "Failed to find the participant response.",
            500
          )
        }

        if (existingResponse) {
          const {
            error: updateError,
          } = await db
            .from("study_responses")
            .update({
              final_comparison:
                comparisonAnswers,

              condition_order:
                conditionOrderValue,
            })
            .eq(
              "participant_id",
              session_id
            )

          if (updateError) {
            console.error(
              "Failed to save final comparison:",
              updateError
            )

            return publicError(
              "Failed to save the final comparison.",
              500
            )
          }

          return NextResponse.json({
            success: true,
            message:
              "Final comparison saved successfully.",
          })
        }

        /*
         * Normally the participant will already have a
         * study_responses row because Survey A/B comes first.
         *
         * This fallback makes the endpoint robust if the
         * comparison is submitted independently.
         */

        const {
          error: insertError,
        } = await db
          .from("study_responses")
          .insert({
            participant_id:
              session_id,

            session_id:
              session_id,

            final_comparison:
              comparisonAnswers,

            condition_order:
              conditionOrderValue,

            created_at:
              new Date().toISOString(),
          })

        if (insertError) {
          console.error(
            "Failed to insert final comparison:",
            insertError
          )

          return publicError(
            "Failed to save the final comparison.",
            500
          )
        }

        return NextResponse.json({
          success: true,
          message:
            "Final comparison saved successfully.",
        })
      } catch (error) {
        console.error(
          "Save comparison exception:",
          error
        )

        return publicError(
          "Failed to save the final comparison.",
          500
        )
      }
    }

    /* ====================================================================== */
    /* UNKNOWN ACTION                                                          */
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