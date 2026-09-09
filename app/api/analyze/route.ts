import { NextResponse } from "next/server"

import { supabase } from "@/lib/supabaseClient"

import { llmService } from "@/lib/llm/llmService"

import {
  CLARIFY_FIRST_QUESTIONS,
  Slot,
} from "@/lib/slots"

import {
  generateChatResponse,
  generateUnguidedRiskRegister,
} from "@/lib/llm/huggingFaceLLM"

const PROMPT_VERSION = "v2.0"

const UNGUIDED_PROMPT_VERSION =
  "unguided-v1.0"

const CLARIFY_PROMPT_VERSION =
  "clarify-first-v1.0"

const ONE_SHOT_PROMPT_VERSION =
  "one-shot-baseline-v1.0"

export async function POST(
  request: Request
) {
  try {
    const body = await request.json()

    const {
      action = "generate",
      brief,
      mode = "one_shot",
      session_id,
      task_type,
      condition_order,
      messages,
      clarificationAnswers,
    } = body

    /**
     * -----------------------------------------------------
     * VALIDATION
     * -----------------------------------------------------
     */

    if (
      !brief ||
      typeof brief !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "A project brief is required.",
        },
        {
          status: 400,
        }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured.",
        },
        {
          status: 500,
        }
      )
    }

    /**
     * -----------------------------------------------------
     * UNGUIDED CHAT
     * -----------------------------------------------------
     */

    if (action === "chat") {
      const conversation =
        Array.isArray(messages)
          ? messages
          : []

      const startTime =
        Date.now()

      const response =
        await generateChatResponse(
          brief,
          conversation
        )

      const latency =
        Date.now() - startTime

      if (session_id) {
        const {
          error,
        } = await supabase
          .from(
            "ethics_interactions"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              "unguided",

            role: "assistant",

            content: response,

            latency_ms: latency,

            created_at:
              new Date().toISOString(),
          })

        if (error) {
          console.error(
            "Failed to save unguided interaction:",
            error
          )
        }
      }

      return NextResponse.json({
        response,
        latency_ms: latency,
      })
    }

    /**
     * -----------------------------------------------------
     * UNGUIDED FINAL RISK REGISTER
     * -----------------------------------------------------
     */

    if (
      action ===
      "generate_unguided"
    ) {
      const conversation =
        Array.isArray(messages)
          ? messages
          : []

      const startTime =
        Date.now()

      const register =
        await generateUnguidedRiskRegister(
          brief,
          conversation
        )

      const latency =
        Date.now() - startTime

      if (session_id) {
        const {
          error,
        } = await supabase
          .from(
            "ethics_submissions"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              "unguided",

            input_text: brief,

            mode: "unguided",

            condition_order:
              condition_order ??
              null,

            slots: [],

            missing_slots: [],

            clarification_questions:
              [],

            clarification_answers:
              {},

            prompt_version:
              UNGUIDED_PROMPT_VERSION,

            latency_ms: latency,

            ai_output: register,

            created_at:
              new Date().toISOString(),
          })

        if (error) {
          console.error(
            "Failed to save unguided submission:",
            error
          )
        }
      }

      return NextResponse.json({
        register,
        latency_ms: latency,
      })
    }

    /**
     * -----------------------------------------------------
     * EXTRACT SLOTS
     * -----------------------------------------------------
     *
     * The LLM extracts contextual slots.
     *
     * BUT the clarification questions are fixed.
     */

    if (
      action ===
      "extract_slots"
    ) {
      const {
        slots,
      } =
        await llmService.extractSlots({
          brief,
        })

      return NextResponse.json({
        slots,

        clarificationQuestions:
          CLARIFY_FIRST_QUESTIONS,
      })
    }

    /**
     * -----------------------------------------------------
     * GENERATE RISK REGISTER
     * -----------------------------------------------------
     */

    if (
      action === "generate"
    ) {
      const {
        slots,
      } =
        await llmService.extractSlots({
          brief,
        })

      /**
       * ALWAYS use the same three questions.
       *
       * We intentionally do not dynamically select
       * questions based on missing slots.
       */
      const fixedQuestions =
        CLARIFY_FIRST_QUESTIONS

      /**
       * Participant answers.
       *
       * Expected structure:
       *
       * {
       *   provenance: "...",
       *   automation: "...",
       *   consequences: "..."
       * }
       */
      const answers =
        clarificationAnswers ??
        {}

      const effectiveMode =
        mode ===
        "clarify_first"
          ? "clarify_first"
          : "one_shot"

      const startTime =
        Date.now()

      /**
       * Same LLM is used for both conditions.
       */
      const {
        register,
      } =
        await llmService.generateRiskRegister(
          {
            brief,

            mode:
              effectiveMode,

            /**
             * Condition A does not receive
             * clarification context.
             *
             * Condition B receives the extracted
             * slots and participant answers.
             */
            slots:
              effectiveMode ===
              "clarify_first"
                ? slots
                : [],

            clarificationAnswers:
              effectiveMode ===
              "clarify_first"
                ? answers
                : {},
          }
        )

      const latency =
        Date.now() - startTime

      const promptVersion =
        effectiveMode ===
        "clarify_first"
          ? CLARIFY_PROMPT_VERSION
          : ONE_SHOT_PROMPT_VERSION

      /**
       * ---------------------------------------------------
       * SAVE RESULT
       * ---------------------------------------------------
       */

      if (session_id) {
        const {
          error,
        } = await supabase
          .from(
            "ethics_submissions"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              (effectiveMode ===
              "clarify_first"
                ? "B"
                : "A"),

            input_text: brief,

            mode:
              effectiveMode,

            condition_order:
              condition_order ??
              null,

            slots:
              effectiveMode ===
              "clarify_first"
                ? slots
                : [],

            missing_slots:
              effectiveMode ===
              "clarify_first"
                ? slots
                    .filter(
                      (
                        slot: Slot
                      ) =>
                        slot.missing
                    )
                    .map(
                      (
                        slot: Slot
                      ) =>
                        slot.id
                    )
                : [],

            /**
             * IMPORTANT:
             *
             * The exact same questions are
             * stored for every participant.
             */
            clarification_questions:
              effectiveMode ===
              "clarify_first"
                ? fixedQuestions
                : [],

            clarification_answers:
              effectiveMode ===
              "clarify_first"
                ? answers
                : {},

            prompt_version:
              promptVersion,

            latency_ms:
              latency,

            ai_output:
              register,

            created_at:
              new Date().toISOString(),
          })

        if (error) {
          console.error(
            "Failed to save risk register:",
            error
          )

          return NextResponse.json(
            {
              error:
                "Risk register generated, but saving the result failed.",

              register,

              latency_ms:
                latency,
            },
            {
              status: 500,
            }
          )
        }
      }

      return NextResponse.json({
        register,

        /**
         * Return the fixed questions so
         * frontend always has the same set.
         */
        clarificationQuestions:
          effectiveMode ===
          "clarify_first"
            ? fixedQuestions
            : [],

        clarificationAnswers:
          effectiveMode ===
          "clarify_first"
            ? answers
            : {},

        latency_ms:
          latency,
      })
    }

    /**
     * -----------------------------------------------------
     * HIDDEN ONE-SHOT BASELINE
     * -----------------------------------------------------
     */

    if (
      action ===
      "generate_baseline"
    ) {
      const startTime =
        Date.now()

      const {
        register,
      } =
        await llmService.generateRiskRegister(
          {
            brief,

            mode: "one_shot",

            slots: [],

            clarificationAnswers:
              {},
          }
        )

      const latency =
        Date.now() - startTime

      if (session_id) {
        const {
          error,
        } = await supabase
          .from(
            "ethics_baseline"
          )
          .insert({
            session_id,

            task_type:
              task_type ??
              "baseline",

            input_text: brief,

            mode: "one_shot",

            condition_order:
              condition_order ??
              null,

            slots: [],

            clarification_questions:
              [],

            clarification_answers:
              {},

            prompt_version:
              ONE_SHOT_PROMPT_VERSION,

            latency_ms:
              latency,

            ai_output:
              register,

            created_at:
              new Date().toISOString(),
          })

        if (error) {
          console.error(
            "Failed to save baseline:",
            error
          )
        }
      }

      return NextResponse.json({
        register,

        latency_ms:
          latency,
      })
    }

    /**
     * -----------------------------------------------------
     * UNKNOWN ACTION
     * -----------------------------------------------------
     */

    return NextResponse.json(
      {
        error:
          `Unknown action: ${action}`,
      },
      {
        status: 400,
      }
    )
  } catch (error) {
    console.error(
      "ANALYZE API ERROR:",
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error."

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    )
  }
}